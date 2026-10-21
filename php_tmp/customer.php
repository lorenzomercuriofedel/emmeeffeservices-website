<?php
/**
 * API privata clienti — PHP >= 7.4, mysqli/mysqlnd, MySQL InnoDB.
 * Tabelle: customers, customer_sessions, stazioni_meteo.customer_id.
 * Non accede alla tabella delle misurazioni dati_stazioni.
 *
 * POST {action:login,email,password} => token + customer + stations
 * GET con Authorization: Bearer <token> => customer + stations
 * PATCH con Bearer => aggiorna i campi del proprio profilo
 * POST {action:logout} con Bearer => revoca sessione
 * Cancellazione account: richiesta via email, non disponibile tramite API.
 *
 * GET ?public=true&id=42 oppure ?public=true&ids=42,43 restituisce
 * solo campi pubblici (senza email, password o sessioni).
 * Il frontend usa /api/customer.php per profili pubblici e area riservata.
 * Credenziali: stesse dei PHP esistenti, con override via variabili ambiente.
 * POST {action:consultation,message} salva una richiesta di consulenza.
 * Rate limit persistente con flock in una directory privata del temp PHP;
 * richiede temp scrivibile e filesystem condiviso tra i worker PHP.
 */

declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

const BODY_LIMIT = 32768;
const LEGAL_VERSION = '2026-10-03-v3';
const SESSION_SECONDS = 28800;
const RATE_WINDOW_SECONDS = 900;
const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';

class CustomerApiError extends RuntimeException
{
    public $status;
    public function __construct(int $status, string $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function rejectRequest(int $status, string $message): void
{
    throw new CustomerApiError($status, $message);
}

function respond(int $status, array $body = []): void
{
    http_response_code($status);
    if ($status !== 204) {
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    exit;
}

function queryDb(mysqli $db, string $sql, string $types = '', array $values = []): mysqli_stmt
{
    $stmt = $db->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$values);
    }
    $stmt->execute();
    return $stmt;
}

function fetchOne(mysqli $db, string $sql, string $types = '', array $values = []): ?array
{
    $stmt = queryDb($db, $sql, $types, $values);
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row;
}

function executeDb(mysqli $db, string $sql, string $types = '', array $values = []): void
{
    $stmt = queryDb($db, $sql, $types, $values);
    $stmt->close();
}

function textLength(string $value): int
{
    if (!preg_match('//u', $value)) {
        rejectRequest(422, 'Invalid UTF-8');
    }
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : preg_match_all('/./us', $value);
}

function validateText($value, int $maximum, bool $required = false): string
{
    if (!is_string($value)) {
        rejectRequest(422, 'Invalid text field');
    }
    $value = trim($value);
    if (textLength($value) > $maximum || ($required && $value === '') || strpos($value, "\0") !== false) {
        rejectRequest(422, 'Invalid text field');
    }
    return $value;
}

function validateEmail($value): string
{
    $email = validateText($value, 254, true);
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        rejectRequest(422, 'Invalid email');
    }
    return strtolower($email);
}

function validatePassword($value): string
{
    // Non fare trim: gli spazi possono far parte della password.
    if (!is_string($value) || $value === '' || strlen($value) > 1024 || strpos($value, "\0") !== false) {
        rejectRequest(422, 'Invalid password');
    }
    return $value;
}

function validateLogo($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $url = validateText($value, 2048);
    if ($url === '') {
        return null;
    }
    $parts = parse_url($url);
    if (!filter_var($url, FILTER_VALIDATE_URL) || !$parts ||
        strtolower($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) ||
        isset($parts['user']) || isset($parts['pass'])) {
        rejectRequest(422, 'Logo must be a public HTTPS URL without credentials');
    }
    // Non scaricare l'immagine sul server: nessuna richiesta a URL utente.
    return $url;
}

function whitelist(array $body, array $allowed): void
{
    if (array_diff(array_keys($body), $allowed)) {
        rejectRequest(422, 'Unexpected fields');
    }
}

function readBody(): array
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        rejectRequest(415, 'JSON required');
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > BODY_LIMIT) {
        rejectRequest(413, 'Payload too large');
    }
    $raw = file_get_contents('php://input', false, null, 0, BODY_LIMIT + 1);
    if ($raw === false) {
        rejectRequest(400, 'Unable to read request');
    }
    if (strlen($raw) > BODY_LIMIT) {
        rejectRequest(413, 'Payload too large');
    }
    try {
        $object = json_decode($raw, false, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        rejectRequest(400, 'Invalid JSON');
    }
    if (!($object instanceof stdClass)) {
        rejectRequest(400, 'JSON object required');
    }
    return (array) $object;
}

function bearerHash(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/i', $header, $matches)) {
        rejectRequest(401, 'Unauthorized');
    }
    return hash('sha256', $matches[1]);
}

/** Contatori condivisi tra richieste, senza nuove tabelle SQL né CORS. */
function rateLimit(array $limits, string $secret): void
{
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR .
        'meteopine-customers-' . substr(hash('sha256', __FILE__ . $secret), 0, 24);
    if (is_link($directory) || (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory))) {
        throw new RuntimeException('Rate limit storage unavailable');
    }
    if (!@chmod($directory, 0700)) {
        throw new RuntimeException('Rate limit storage permissions unavailable');
    }
    $path = $directory . DIRECTORY_SEPARATOR . 'attempts.json';
    if (is_link($path)) {
        throw new RuntimeException('Invalid rate limit storage');
    }
    $file = @fopen($path, 'c+');
    if ($file === false) {
        throw new RuntimeException('Rate limit storage unavailable');
    }
    try {
        if (!@chmod($path, 0600) || !flock($file, LOCK_EX)) {
            throw new RuntimeException('Unable to lock rate limit storage');
        }
        $contents = stream_get_contents($file, 4194305);
        if ($contents === false || strlen($contents) > 4194304) {
            throw new RuntimeException('Invalid rate limit storage');
        }
        $state = $contents === '' ? [] : json_decode($contents, true, 8, JSON_THROW_ON_ERROR);
        if (!is_array($state)) {
            throw new RuntimeException('Invalid rate limit storage');
        }
        $now = time();
        foreach ($state as $key => $entry) {
            if (!is_array($entry) || ($entry['expires'] ?? 0) <= $now) {
                unset($state[$key]);
            }
        }
        foreach ($limits as $identity => $maximum) {
            $key = hash_hmac('sha256', $identity, $secret);
            if (($state[$key]['count'] ?? 0) >= $maximum) {
                header('Retry-After: ' . max(1, $state[$key]['expires'] - $now));
                rejectRequest(429, 'Too many attempts');
            }
            if (!isset($state[$key])) {
                $state[$key] = ['count' => 0, 'expires' => $now + RATE_WINDOW_SECONDS];
            }
            $state[$key]['count']++;
        }
        $encoded = json_encode($state, JSON_THROW_ON_ERROR);
        if (strlen($encoded) > 4194304 || !rewind($file) || !ftruncate($file, 0) ||
            fwrite($file, $encoded) !== strlen($encoded) || !fflush($file)) {
            throw new RuntimeException('Unable to persist rate limit');
        }
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

function issueVerification(mysqli $db, int $customerId, string $email): void
{
    $token = bin2hex(random_bytes(32));
    executeDb($db, 'DELETE FROM customer_email_verifications WHERE customer_id = ?', 'i', [$customerId]);
    executeDb($db, 'INSERT INTO customer_email_verifications (token_hash, customer_id, email, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))', 'sis', [hash('sha256', $token), $customerId, $email]);
    $url = 'https://emmeeffeservices.it/meteo/customer-area#verify=' . rawurlencode($token);
    // Impostare un mittente autorizzato da AlterVista tramite CUSTOMER_MAIL_FROM.
    $from = getenv('CUSTOMER_MAIL_FROM') ?: 'meteopine@altervista.org';
    if (!filter_var($from, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $from)) throw new RuntimeException('Invalid mail sender');
    $headers = 'From: ' . $from . "\r\n" . 'Reply-To: info@emmeeffeservices.it' . "\r\n" . 'Content-Type: text/plain; charset=UTF-8';
    $message = "Conferma il tuo indirizzo email per Emme-Effe Services:\n\n" . $url . "\n\nIl link scade dopo 24 ore e può essere usato una sola volta.\nSe non hai richiesto questa operazione, ignora questa email.\nAssistenza: info@emmeeffeservices.it";
    if (!mail($email, 'Conferma email - Emme-Effe Services', $message, $headers)) {
        rejectRequest(503, 'Verification email could not be sent');
    }
}

function createSession(mysqli $db, int $customerId): string
{
    $token = bin2hex(random_bytes(32));
    executeDb($db, 'INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))', 'sii', [hash('sha256', $token), $customerId, SESSION_SECONDS]);
    return $token;
}

function removeOwnedLogo(?string $url, int $customerId): void
{
    $prefix = 'https://meteopine.altervista.org/api/customer-logos/';
    if (!$url || strpos($url, $prefix) !== 0) return;
    $name = substr($url, strlen($prefix));
    if (!preg_match('/^' . $customerId . '-[a-f0-9]{32}\.png$/', $name)) return;
    $path = __DIR__ . '/customer-logos/' . $name;
    if (is_file($path) && !is_link($path)) @unlink($path);
}

function profileResponse(mysqli $db, array $customer): array
{
    $id = (int) $customer['id'];
    $stmt = queryDb($db, 'SELECT id, nome, disabled FROM stazioni_meteo WHERE customer_id = ? ORDER BY nome, id', 'i', [$id]);
    $result = $stmt->get_result();
    $stations = [];
    while ($station = $result->fetch_assoc()) {
        $stations[] = ['id' => (int) $station['id'], 'nome' => $station['nome'], 'disabled' => (bool) $station['disabled']];
    }
    $stmt->close();
    return [
        'customer' => [
            'id' => $id,
            'name' => $customer['name'],
            'email' => $customer['email'],
            'project_name' => $customer['project_name'],
            'description' => $customer['description'],
            'project_type' => $customer['project_type'],
            'logo_url' => $customer['logo_url'],
            'web_public' => (bool) $customer['web_public'],
            'contact_email' => $customer['contact_email'],
            'website_url' => $customer['website_url'],
            'contact_email_public' => (bool) $customer['contact_email_public'],
            'website_public' => (bool) $customer['website_public'],
        ],
        'stations' => $stations,
    ];
}

$db = null;
$transaction = false;
$newLogoFile = null;
$oldLogoToRemove = null;
try {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'OPTIONS') {
        header('Allow: GET, POST, PATCH, OPTIONS');
        respond(204);
    }
    if (!in_array($method, ['GET', 'POST', 'PATCH'], true)) {
        header('Allow: GET, POST, PATCH, OPTIONS');
        rejectRequest(405, 'Method not allowed');
    }
    // Un ID in query seleziona soltanto il profilo PUBBLICO, mai quello privato.
    $publicIds = null;
    if ($_GET) {
        whitelist($_GET, ['public', 'id', 'ids']);
        if ($method !== 'GET' || ($_GET['public'] ?? null) !== 'true' ||
            (isset($_GET['id']) === isset($_GET['ids']))) {
            rejectRequest(422, 'Invalid public profile query');
        }
        $rawIds = $_GET['ids'] ?? $_GET['id'];
        if (!is_string($rawIds) || strlen($rawIds) > 1100) {
            rejectRequest(422, 'Invalid customer IDs');
        }
        $parts = explode(',', $rawIds);
        if (count($parts) > 100 || (isset($_GET['id']) && count($parts) !== 1)) {
            rejectRequest(422, 'Too many customer IDs');
        }
        $publicIds = [];
        foreach ($parts as $id) {
            if (!preg_match('/^[1-9][0-9]{0,9}$/', $id) || (float) $id > 4294967295) {
                rejectRequest(422, 'Invalid customer ID');
            }
            $publicIds[] = (int) $id;
        }
        $publicIds = array_values(array_unique($publicIds));
    }
    $body = $method === 'GET' ? [] : readBody();
    $action = $body['action'] ?? null;
    if ($method === 'POST' && $action === 'register') rejectRequest(403, 'Self-registration disabled');
    if ($method === 'POST' && !in_array($action, ['login', 'access_request', 'verify_email', 'resend_verification', 'logout', 'consultation', 'station_visibility'], true)) {
        rejectRequest(422, 'Invalid action');
    }

    $dbHost = getenv('CUSTOMER_DB_HOST') ?: 'localhost';
    $dbUser = getenv('CUSTOMER_DB_USER') ?: 'meteopine';
    $dbPassword = getenv('CUSTOMER_DB_PASSWORD') ?: 'zKC7JbyMGrHb';
    $dbName = getenv('CUSTOMER_DB_NAME') ?: 'my_meteopine';
    $rateSecret = hash('sha256', $dbPassword . $dbName . __FILE__);
    // REMOTE_ADDR è affidabile; non usare X-Forwarded-For inviabile dal client.
    // Dietro il proxy Next.js l'IP può essere condiviso: soglia IP più alta.
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    $loginEmail = null;
    $loginPassword = null;
    $tokenHash = null;
    if ($method === 'POST' && $action === 'login') {
        whitelist($body, ['action', 'email', 'password']);
        $loginEmail = validateEmail($body['email'] ?? null);
        $loginPassword = validatePassword($body['password'] ?? null);
        // Conta anche i login riusciti: 5/account e 100/IP ogni 15 minuti.
        rateLimit(['login:ip:' . $ip => 100, 'login:account:' . $loginEmail => 5], $rateSecret);
    } elseif ($method === 'POST' && $action === 'access_request') {
        whitelist($body, ['action', 'name', 'email', 'description', 'privacy_acknowledged', 'service']);
        if (($body['privacy_acknowledged'] ?? null) !== true) rejectRequest(422, 'Privacy acknowledgement required');
        $service = $body['service'] ?? null;
        if (!in_array($service, ['data', 'land'], true)) rejectRequest(422, 'Invalid service');
        $serviceName = ['data' => 'elaborazione dati', 'land' => 'fondiaria'][$service];
        $requestName = validateText($body['name'] ?? null, 255, true);
        $requestEmail = validateEmail($body['email'] ?? null);
        $requestDescription = validateText($body['description'] ?? '', 5000);
        rateLimit(['access:ip:' . $ip => 20, 'access:email:' . $requestEmail => 3], $rateSecret);
        $from = getenv('CUSTOMER_MAIL_FROM') ?: 'meteopine@altervista.org';
        if (!filter_var($from, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $from)) throw new RuntimeException('Invalid mail sender');
        if (preg_match('/[\r\n]/', $requestEmail)) rejectRequest(422, 'Invalid email');
        $headers = 'From: ' . $from . "\r\n" . 'Reply-To: ' . $requestEmail . "\r\n" . 'Content-Type: text/plain; charset=UTF-8';
        $message = "Richiesta di consulenza " . $serviceName . "\n\nNome: " . $requestName . "\nEmail: " . $requestEmail . "\n\n" . $requestDescription . "\n\nInformativa privacy presa in visione. Nessun account creato.";
        if (!mail('info@emmeeffeservices.it', 'Richiesta consulenza ' . $serviceName, $message, $headers)) rejectRequest(503, 'Request email could not be sent');
        respond(200, ['request_sent' => true]);
    } elseif ($method === 'POST' && $action === 'verify_email') {
        whitelist($body, ['action', 'verification_token']);
        if (!is_string($body['verification_token'] ?? null) || !preg_match('/^[a-f0-9]{64}$/', $body['verification_token'])) rejectRequest(422, 'Invalid verification token');
        rateLimit(['verify:ip:' . $ip => 100], $rateSecret);
    } elseif ($method === 'POST' && $action === 'resend_verification') {
        whitelist($body, ['action', 'email']);
        $resendEmail = validateEmail($body['email'] ?? null);
        rateLimit(['resend:ip:' . $ip => 30, 'resend:email:' . $resendEmail => 3], $rateSecret);
    } elseif ($publicIds === null) {
        $tokenHash = bearerHash();
    }

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = new mysqli($dbHost, $dbUser, $dbPassword, $dbName);
    $db->set_charset('utf8mb4');
    if ($publicIds !== null) {
        $placeholders = implode(',', array_fill(0, count($publicIds), '?'));
        $stmt = queryDb($db,
            'SELECT c.id, c.name, c.project_name, c.description, c.project_type, c.logo_url, c.web_public, CASE WHEN c.contact_email_public = 1 THEN c.contact_email ELSE NULL END AS contact_email, CASE WHEN c.website_public = 1 THEN c.website_url ELSE NULL END AS website_url FROM customers c WHERE c.id IN (' . $placeholders . ') AND (c.email_verification_required = 0 OR c.email_verified_at IS NOT NULL) AND EXISTS (SELECT 1 FROM stazioni_meteo s WHERE s.customer_id = c.id) ORDER BY c.id',
            str_repeat('i', count($publicIds)), $publicIds);
        $result = $stmt->get_result();
        $profiles = [];
        while ($profile = $result->fetch_assoc()) {
            $profile['id'] = (int) $profile['id'];
            $profile['web_public'] = (bool) $profile['web_public'];
            $profiles[] = $profile;
        }
        $stmt->close();
        // Nessuna cache PHP: il frontend gestisce la cache dei dati pubblici.
        if (isset($_GET['id'])) {
            if (!$profiles) rejectRequest(404, 'Customer not found');
            respond(200, ['customer' => $profiles[0]]);
        }
        respond(200, ['customers' => $profiles]);
    }
    $db->begin_transaction();
    $transaction = true;

    if ($method === 'POST' && $action === 'verify_email') {
        $verification = fetchOne($db, 'SELECT customer_id, email FROM customer_email_verifications WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE', 's', [hash('sha256', $body['verification_token'])]);
        if (!$verification) rejectRequest(422, 'Verification link expired or already used');
        $customerId = (int) $verification['customer_id'];
        $customer = fetchOne($db, 'SELECT * FROM customers WHERE id = ? FOR UPDATE', 'i', [$customerId]);
        if (!$customer) rejectRequest(422, 'Invalid verification');
        executeDb($db, 'UPDATE customers SET email = ?, email_verified_at = UTC_TIMESTAMP() WHERE id = ?', 'si', [$verification['email'], $customerId]);
        executeDb($db, 'DELETE FROM customer_email_verifications WHERE customer_id = ?', 'i', [$customerId]);
        executeDb($db, 'DELETE FROM customer_sessions WHERE customer_id = ?', 'i', [$customerId]);
        $customer['email'] = $verification['email'];
        $response = profileResponse($db, $customer);
        $response['token'] = createSession($db, $customerId);
    } elseif ($method === 'POST' && $action === 'resend_verification') {
        $customer = fetchOne($db, 'SELECT * FROM customers WHERE email = ? FOR UPDATE', 's', [$resendEmail]);
        if ($customer && (int) $customer['email_verification_required'] === 1 && !$customer['email_verified_at']) issueVerification($db, (int) $customer['id'], $resendEmail);
        // Stessa risposta anche se la mail è sconosciuta o già verificata.
        $response = ['verification_required' => true];
    } elseif ($method === 'POST' && $action === 'login') {
        $customer = fetchOne($db, 'SELECT * FROM customers WHERE email = ? FOR UPDATE', 's', [$loginEmail]);
        // Verifica un hash valido anche se l'account non esiste.
        $validPassword = password_verify($loginPassword, $customer['password_hash'] ?? DUMMY_PASSWORD_HASH);
        if (!$customer || !$validPassword) {
            rejectRequest(401, 'Invalid credentials');
        }
        if ((int) $customer['email_verification_required'] === 1 && !$customer['email_verified_at']) rejectRequest(403, 'Email verification required');
        $customerId = (int) $customer['id'];
        if (password_needs_rehash($customer['password_hash'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($loginPassword, PASSWORD_DEFAULT);
            if ($newHash === false) {
                throw new RuntimeException('Password hashing failed');
            }
            executeDb($db, 'UPDATE customers SET password_hash = ? WHERE id = ?', 'si', [$newHash, $customerId]);
        }
        executeDb($db, 'DELETE FROM customer_sessions WHERE customer_id = ? AND expires_at <= UTC_TIMESTAMP()', 'i', [$customerId]);
        $token = bin2hex(random_bytes(32));
        executeDb($db,
            'INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))',
            'sii', [hash('sha256', $token), $customerId, SESSION_SECONDS]);
        $response = profileResponse($db, $customer);
        $response['token'] = $token;
    } else {
        // Cliente e sessione bloccati fino al commit: niente aggiornamenti
        // tramite token scaduti/revocati o cancellazioni concorrenti.
        $customer = fetchOne($db,
            'SELECT c.* FROM customers c JOIN customer_sessions s ON s.customer_id = c.id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() FOR UPDATE',
            's', [$tokenHash]);
        if (!$customer) {
            rejectRequest(401, 'Unauthorized');
        }
        $customerId = (int) $customer['id'];
        if ($method === 'GET') {
            $response = profileResponse($db, $customer);
        } elseif ($method === 'POST' && $action === 'station_visibility') {
            whitelist($body, ['action', 'station_id', 'disabled']);
            $stationId = $body['station_id'] ?? null;
            $disabled = $body['disabled'] ?? null;
            if (!is_int($stationId) || $stationId < 1 || !is_bool($disabled)) rejectRequest(422, 'Invalid station visibility');
            // Verificare la proprietà anche nel WHERE dell'aggiornamento.
            $station = fetchOne($db, 'SELECT id FROM stazioni_meteo WHERE id = ? AND customer_id = ? FOR UPDATE', 'ii', [$stationId, $customerId]);
            if (!$station) rejectRequest(404, 'Station not found');
            executeDb($db, 'UPDATE stazioni_meteo SET disabled = ? WHERE id = ? AND customer_id = ?', 'iii', [$disabled ? 1 : 0, $stationId, $customerId]);
            $response = profileResponse($db, $customer);
        } elseif ($method === 'POST' && $action === 'consultation') {
            whitelist($body, ['action', 'message']);
            $message = validateText($body['message'] ?? null, 5000, true);
            rateLimit(['consultation:customer:' . $customerId => 3, 'consultation:ip:' . $ip => 100], $rateSecret);
            executeDb($db, 'INSERT INTO customer_consultations (customer_id, message) VALUES (?, ?)', 'is', [$customerId, $message]);
            $requestId = (int) $db->insert_id;
            $response = profileResponse($db, $customer);
            $response['consultation'] = ['id' => $requestId, 'status' => 'new'];
        } elseif ($method === 'POST') {
            whitelist($body, ['action']);
            executeDb($db, 'DELETE FROM customer_sessions WHERE token_hash = ?', 's', [$tokenHash]);
            $response = [];
        } elseif ($method === 'PATCH') {
            $allowed = ['name', 'email', 'project_name', 'description', 'project_type', 'logo_url', 'web_public', 'contact_email', 'website_url', 'contact_email_public', 'website_public'];
            whitelist($body, $allowed);
            if (!$body) {
                rejectRequest(422, 'No fields to update');
            }
            $hasStation = fetchOne($db, 'SELECT id FROM stazioni_meteo WHERE customer_id = ? LIMIT 1', 'i', [$customerId]);
            if (!$hasStation && array_intersect(array_keys($body), ['project_type', 'logo_url', 'web_public'])) {
                rejectRequest(403, 'Station settings require an assigned station');
            }
            $updated = $customer;
            foreach ($body as $field => $value) {
                switch ($field) {
                    case 'name':
                        $updated[$field] = validateText($value, 255, true);
                        break;
                    case 'email':
                        $updated[$field] = validateEmail($value);
                        break;
                    case 'project_name':
                        $updated[$field] = $value === null ? null : validateText($value, 255);
                        break;
                    case 'description':
                        $updated[$field] = $value === null ? null : validateText($value, 5000);
                        break;
                    case 'project_type':
                        if ($value === '' || $value === null) {
                            $updated[$field] = null;
                        } elseif (is_string($value) && in_array($value, ['professional', 'hobby', 'other'], true)) {
                            $updated[$field] = $value;
                        } else {
                            rejectRequest(422, 'Invalid project type');
                        }
                        break;
                    case 'logo_url':
                        $updated[$field] = validateLogo($value);
                        break;
                    case 'contact_email':
                        $updated[$field] = ($value === '' || $value === null) ? null : validateEmail($value);
                        break;
                    case 'website_url':
                        $updated[$field] = validateLogo($value);
                        break;
                    case 'contact_email_public':
                    case 'website_public':
                    case 'web_public':
                        if (!is_bool($value)) {
                            rejectRequest(422, 'web_public must be boolean');
                        }
                        $updated[$field] = $value ? 1 : 0;
                        break;
                }
            }
            $emailChange = $updated['email'] !== $customer['email'];
            if ($emailChange) {
                issueVerification($db, $customerId, $updated['email']);
                $updated['email'] = $customer['email']; // Cambia solo alla conferma del nuovo indirizzo.
            }
            if ($updated['logo_url'] !== $customer['logo_url']) $oldLogoToRemove = $customer['logo_url'];
            executeDb($db,
                'UPDATE customers SET name = ?, email = ?, project_name = ?, description = ?, project_type = ?, logo_url = ?, web_public = ?, contact_email = ?, website_url = ?, contact_email_public = ?, website_public = ? WHERE id = ?',
                'ssssssissiii', [$updated['name'], $updated['email'], $updated['project_name'], $updated['description'], $updated['project_type'], $updated['logo_url'], (int) $updated['web_public'], $updated['contact_email'], $updated['website_url'], (int) $updated['contact_email_public'], (int) $updated['website_public'], $customerId]);
            $response = profileResponse($db, $updated);
            if ($emailChange) $response['email_change_pending'] = true;
        }
    }
    $db->commit();
    $transaction = false;
    $newLogoFile = null; // Il file ora è referenziato dal database.
    if ($oldLogoToRemove) removeOwnedLogo($oldLogoToRemove, $customerId);
    // Logout/cancellazione senza body: il proxy supporta 204.
    if ($method === 'POST' && $action === 'logout') {
        respond(204);
    }
    respond(200, $response);
} catch (Throwable $e) {
    if ($newLogoFile && is_file($newLogoFile)) @unlink($newLogoFile);
    if ($db instanceof mysqli && $transaction) {
        try {
            $db->rollback();
        } catch (Throwable $rollbackError) {
            error_log('Customer API: transaction rollback failed');
        }
    }
    if ($e instanceof CustomerApiError) {
        respond($e->status, ['error' => $e->getMessage()]);
    }
    if ($e instanceof mysqli_sql_exception && (int) $e->getCode() === 1062) {
        respond(409, ['error' => 'Email already registered']);
    }
    // Non esporre SQL, credenziali, password, token o dati personali nei log.
    error_log('Customer API: internal error (' . get_class($e) . ', code ' . (int) $e->getCode() . ')');
    respond(500, ['error' => 'Service unavailable']);
}
