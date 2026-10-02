# Area clienti — backend AlterVista PHP + MySQL

## Cosa implementa questo repository

- `/meteo/customer-area`, `/meteo/en/customer-area`, `/meteo/de/customer-area`: login, modifica del proprio profilo, elenco delle stazioni assegnate, anteprima logo, logout e cancellazione account con password.
- Il browser chiama `/api/customers` sul sito Next.js. Questa route inoltra le richieste a **https://meteopine.altervista.org/api/customers.php**, senza cache.
- Il token PHP viene custodito in un cookie HttpOnly (Secure in produzione, SameSite=Lax, durata 8 ore). Non viene restituito al JavaScript o salvato in localStorage. Le mutazioni richiedono Origin uguale all'origine Next.js e Content-Type JSON.
- Il logo HTTPS compare a destra del titolo nella pagina stazione, nella posizione indicata nello screenshot; su mobile va sotto il titolo. Senza logo o con immagine non caricabile il riquadro non appare. Il rosso dello screenshot è solo un'indicazione della posizione.
- L'area ha `noindex, nofollow` e non viene aggiunta alla sitemap.

**Il PHP e il database non sono in questo repository. Il frontend sarà operativo dopo aver implementato il contratto seguente.** Non ho verificato lo schema SQL reale: `dati_stazioni.php` è l'endpoint delle misurazioni, `stazioni_meteo.php` quello dell'anagrafica. Non si può dedurre da questi nomi il nome della tabella SQL. Gli esempi sotto assumono che `dati_stazioni` sia l'anagrafica, con PK `id` INT UNSIGNED: verificare con `SHOW CREATE TABLE dati_stazioni` e adattare nomi e tipi prima di eseguire.

## Relazioni SQL

Un cliente ha più stazioni; una stazione ha al massimo un cliente. Aggiungere `customer_id` **nell'anagrafica**, non su ogni riga di rilevazione. Se `dati_stazioni` contiene invece le misurazioni, aggiungerlo alla vera tabella anagrafica (es. `stazioni_meteo`); le misurazioni continuano a riferirsi alla stazione con la loro FK esistente.

```sql
CREATE TABLE customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  description TEXT NULL,
  project_type ENUM('professional', 'hobby', 'other') NULL,
  logo_url VARCHAR(2048) NULL,
  web_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SOLO se dati_stazioni è l'anagrafica delle stazioni:
ALTER TABLE dati_stazioni
  ADD COLUMN customer_id INT UNSIGNED NULL,
  ADD INDEX idx_station_customer (customer_id),
  ADD CONSTRAINT fk_station_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL;

CREATE TABLE customer_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_customer (customer_id),
  INDEX idx_session_expiry (expires_at),
  CONSTRAINT fk_session_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Verificare InnoDB su entrambe le tabelle. Se AlterVista non consente FK sul database attuale, applicare gli stessi vincoli esplicitamente nelle transazioni PHP e verificare gli orfani. Non usare `ON DELETE CASCADE` tra clienti e stazioni o misurazioni.

Per migrare il campo testuale `customer`: creare un cliente per ogni identità verificata, assegnare `customer_id` alle stazioni, conservare il testo nell'API mediante JOIN. Non associare automaticamente clienti con stesso nome senza verificarli. Email e credenziali si raccolgono fuori dal sito; niente registrazione aperta. Generare password con `password_hash($password, PASSWORD_DEFAULT)` e consegnare le credenziali mediante un canale concordato. Gli assegnamenti delle stazioni si effettuano lato amministratore; il cliente non può cambiare `customer_id` né reclamare stazioni.

## Contratto di customers.php

Tutte le risposte JSON hanno `Content-Type: application/json; charset=utf-8` e `Cache-Control: no-store`. Tutti gli errori restituiscono uno status HTTP non 2xx e `{ "error": "..." }`; il frontend mostra messaggi generici. Non restituire HTML, redirect o messaggi SQL. Non serve CORS: PHP è chiamato dal server Next.js. Assicurarsi che il dominio senza `www` risponda direttamente, senza redirect; il proxy li rifiuta.

Il campo `customer` nelle risposte private è un oggetto:

```json
{
  "customer": {
    "id": 42,
    "name": "Cliente esempio",
    "email": "cliente@example.com",
    "description": "Il nostro osservatorio",
    "project_type": "hobby",
    "logo_url": "https://example.com/logo.png",
    "web_public": false
  },
  "stations": [{ "id": 123, "nome": "Stazione esempio" }]
}
```

`description` per l'area riservata è un semplice testo. `project_type` e `logo_url` possono essere null; la modifica invia una stringa vuota per azzerarli. La modifica restituisce sempre l'intero profilo aggiornato e l'elenco stazioni. Email, hash password, sessioni e token non devono finire nelle API pubbliche.

| Metodo | Body JSON | Comportamento |
| --- | --- | --- |
| POST | `{"action":"login","email":"…","password":"…"}` | Verifica credenziali, crea sessione, restituisce profilo, stazioni e `token` |
| GET | nessuno | Profilo e stazioni del cliente autenticato |
| PATCH | `{"name":"…","email":"…","description":"…","project_type":"hobby","logo_url":"https://…","web_public":false}` | Modifica solo questi campi del cliente autenticato; restituisce profilo e stazioni |
| POST | `{"action":"logout"}` | Revoca la sessione corrente; `200 {}` o `204` |
| DELETE | `{"password":"…"}` | Verifica di nuovo password, scollega stazioni, elimina cliente e tutte le sue sessioni; `200 {}` o `204` |

Tutte le richieste tranne login richiedono `Authorization: Bearer <token>`. Non leggere un ID dal body/query per decidere quale profilo modificare: usare esclusivamente il cliente risolto dalla sessione. `401` per credenziali/sessione/password errate, `422` per campi invalidi, `409` per email già registrata, `429` per rate limit, `405` per metodo non consentito.

## Struttura PHP consigliata

Configurazione PDO e credenziali in un file non accessibile dal web, con `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`, `PDO::ATTR_EMULATE_PREPARES => false` e `charset=utf8mb4`. Usare sempre prepared statements. Abilitare HTTPS, disattivare `display_errors`, registrare gli errori server senza password o token.

Login:

```php
// Dopo validazione JSON, email e rate limit su IP/account:
$stmt = $pdo->prepare('SELECT * FROM customers WHERE email = ?');
$stmt->execute([$email]);
$customer = $stmt->fetch(PDO::FETCH_ASSOC);
// Applicare password_verify anche con un hash fittizio valido per account assente.
if (!$customer || !password_verify($password, $customer['password_hash'])) {
    respond(401, ['error' => 'Invalid credentials']);
}
$token = bin2hex(random_bytes(32)); // 64 caratteri; compatibile con il proxy
$stmt = $pdo->prepare('INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))');
$stmt->execute([hash('sha256', $token), $customer['id']]);
// Risposta: token + publicPrivateProfile($customer) + stationsFor($customer['id']).
// publicPrivateProfile è una whitelist; NON inviare password_hash.
```

Autenticazione per GET/PATCH/logout/DELETE (prima di qualsiasi accesso):

```php
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer ([a-f0-9]{64})$/', $authorization, $match)) {
    respond(401, ['error' => 'Unauthorized']);
}
$tokenHash = hash('sha256', $match[1]);
$stmt = $pdo->prepare('SELECT c.* FROM customer_sessions s JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()');
$stmt->execute([$tokenHash]);
$customer = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$customer) respond(401, ['error' => 'Unauthorized']);
$customerId = $customer['id'];
```

`respond($status, $body)` deve impostare status/header, serializzare JSON e chiamare `exit`. Le funzioni nei commenti sono da implementare. Verificare che AlterVista inoltri Authorization in PHP; se il server lo rimuove, configurarne il passaggio lato hosting prima di usare l'area.

PATCH: accettare una whitelist fissa; rifiutare `id`, `customer_id`, `stations`, `password_hash`, `role` e campi non previsti. Limiti: nome 1–255 caratteri dopo trim, email valida max 254, descrizione max 5000, URL max 2048 con schema HTTPS, host presente e senza credenziali; tipo in enum o null; consenso strettamente booleano. Nessun fetch server del logo: si tratta di un URL pubblico renderizzato dal browser, non di upload. Preferire immagini raster pubbliche stabili. Email univoca con `409` in caso di conflitto. Non consentire PATCH della password in questo contratto. Verificare email nuova prima di usarla per eventuali futuri recuperi password.

```sql
UPDATE customers
SET name = ?, email = ?, description = ?, project_type = ?, logo_url = ?, web_public = ?
WHERE id = ?; -- ultimo parametro: customerId della sessione

SELECT id, nome FROM dati_stazioni WHERE customer_id = ?;
```

DELETE: richiedere password e `password_verify`, poi transazione. Con FK la cancellazione cliente scollega stazioni e revoca sessioni. Se le FK non sono disponibili:

```php
$pdo->beginTransaction();
try {
    // Bloccare e rileggere cliente con SELECT ... FOR UPDATE,
    // poi verificare password dentro la transazione.
    $pdo->prepare('UPDATE dati_stazioni SET customer_id = NULL WHERE customer_id = ?')->execute([$customerId]);
    $pdo->prepare('DELETE FROM customer_sessions WHERE customer_id = ?')->execute([$customerId]);
    $pdo->prepare('DELETE FROM customers WHERE id = ?')->execute([$customerId]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
```

In migrazione, se rimane anche la vecchia colonna testuale `customer`, azzerarla sulle stazioni scollegate o smettere di esporla: altrimenti il frontend continuerà a mostrare il nome cancellato. Nessuna query deve eliminare misurazioni. Logout elimina solo la sessione con `token_hash` corrente. Rimuovere periodicamente le sessioni scadute. Implementare un rate limit persistente per login e tentativi di password di cancellazione (es. 5 tentativi/15 minuti per account e per IP, con backoff); non usare un contatore solo in memoria PHP. Limitare il body a 32 KB anche sul PHP.

## Aggiungere logo e cliente alle API stazioni

La pagina stazione legge il logo dall'anagrafica in `stazioni_meteo.php`, **non** dal profilo privato. Estendere sia elenco sia dettaglio tramite JOIN:

```sql
SELECT s.*, c.id AS customer_id, c.name AS customer,
       c.description AS customer_description,
       c.project_type AS customer_project_type,
       c.web_public AS customer_web_public,
       c.logo_url AS customer_logo_url
FROM dati_stazioni s
LEFT JOIN customers c ON c.id = s.customer_id;
-- Usare filtri e ordinamento attuali, con parametri preparati per il dettaglio.
```

Per evitare campi duplicati/ambigui, in produzione preferire colonne esplicite a `s.*`, e rimuovere la vecchia colonna `s.customer` dalla selezione. Esempio compatibile con il frontend attuale:

```json
{
  "id": 123,
  "nome": "Stazione esempio",
  "customer": "Cliente esempio",
  "customer_id": 42,
  "customer_description": "Il nostro osservatorio",
  "customer_project_type": "hobby",
  "customer_web_public": 0,
  "customer_logo_url": "https://example.com/logo.png"
}
```

È supportato anche `customer: {id, name, description, project_type, web_public, logo_url}`. Il logo è pubblico quando configurato; `web_public` controlla solo indicizzazione della pagina progetto, come documentato in [CUSTOMERS.md](CUSTOMERS.md). Nessun logo se cliente mancante. L'anagrafica della stazione è in cache fino a 300 secondi: aggiornamento/rimozione logo può richiedere 5 minuti; le risposte dell'area riservata sono immediate. Se PHP ha altra cache, invalidarla sulle mutazioni.

## Verifica prima della messa online

1. Fare backup e verificare nomi/tipi/tabelle reali; applicare migrazione su una copia.
2. Implementare PHP, creare account di prova e assegnare due stazioni.
3. Provare login errato/corretto, GET senza token, scadenza, logout e token revocato.
4. Provare PATCH di profilo/logo, email duplicata, URL non HTTPS e consenso; verificare risposta completa e aggiornamento delle API pubbliche.
5. Con due account provare di inviare ID dell'altro: deve essere rifiutato e non modificare dati altrui.
6. Provare cancellazione con password errata/corretta: cliente/sessioni spariscono, stazioni hanno customer_id NULL, misurazioni restano identiche, logo sparisce dopo cache.
7. Verificare in browser desktop/mobile le tre lingue, URL privati noindex e assenza di dati privati nelle risposte pubbliche.

Per chiamate manuali usare credenziali di test e un client HTTP; conservare il token solo per la durata della prova. Il backend non è stato distribuito da questa modifica.
