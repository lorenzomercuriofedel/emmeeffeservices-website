<?php
// Anagrafica stazioni: il cliente si risolve da customer.php tramite customer_id.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$stage = 'connect';
try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $mysqli = new mysqli("localhost","meteopine","zKC7JbyMGrHb","my_meteopine");
    $stage = 'charset';
    $mysqli->set_charset('utf8mb4');
    // Non dipendere dalla vecchia colonna testuale customer.
    $columns = 'id, codice, nome, frazione, comune, altitudine, latitudine, longitudine, data_installazione, modello, altezza_dal_suolo, altezza_anemometro_dal_suolo, ubicazione, tipo_terreno, schermo_solare, informazioni, customer_id, disabled';
    $root = null;
    if (($_GET['all'] ?? null) === 'true') {
        $stage = 'prepare';
        $stmt = $mysqli->prepare('SELECT ' . $columns . ' FROM stazioni_meteo WHERE disabled = 0');
        $stage = 'execute';
        $stmt->execute();
        $stage = 'fetch';
        $result = $stmt->get_result();
        $root = ['stazioni' => []];
        while ($row = $result->fetch_assoc()) {
            $root['stazioni'][] = $row;
        }
        $stmt->close();
    } elseif (isset($_GET['id'])) {
        $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            http_response_code(422);
            echo json_encode(['error' => 'Invalid station ID']);
            exit;
        }
        $stage = 'prepare';
        $stmt = $mysqli->prepare('SELECT ' . $columns . ' FROM stazioni_meteo WHERE id = ? AND disabled = 0');
        // bind_param richiede una variabile passata per riferimento.
        $stmt->bind_param('i', $id);
        $stage = 'execute';
        $stmt->execute();
        $stage = 'fetch';
        $root = ['anagrafica' => $stmt->get_result()->fetch_assoc()];
        $stmt->close();
    }
    $stage = 'encode';
    echo json_encode($root, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    error_log('Station registry API: stage=' . $stage . ' code=' . (int) $e->getCode() . ' ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Station registry unavailable', 'stage' => $stage, 'error_code' => (int) $e->getCode()]);
}
