# Area clienti — backend AlterVista PHP + MySQL

## Cosa implementa questo repository

- `/meteo/customer-area`, `/meteo/en/customer-area`, `/meteo/de/customer-area`: registrazione autonoma, login, richiesta di consulenza, modifica del proprio profilo, elenco delle stazioni assegnate, anteprima logo, logout e cancellazione account con password.
- Il browser chiama `/api/customers` sul sito Next.js. Questa route inoltra le richieste a **https://meteopine.altervista.org/api/customer.php**, senza cache.
- Il token PHP viene custodito in un cookie HttpOnly (Secure in produzione, SameSite=Lax, durata 8 ore). Non viene restituito al JavaScript o salvato in localStorage. Le mutazioni richiedono Origin uguale all'origine Next.js e Content-Type JSON.
- Il logo HTTPS compare a destra del titolo nella pagina stazione, nella posizione indicata nello screenshot; su mobile va sotto il titolo. Senza logo o con immagine non caricabile il riquadro non appare. Il rosso dello screenshot è solo un'indicazione della posizione.
- L'area ha `noindex, nofollow` e non viene aggiunta alla sitemap.

Il backend da caricare su AlterVista è [php_tmp/customer.php](php_tmp/customer.php). Usa la connessione già presente nelle API, con override tramite `CUSTOMER_DB_HOST`, `CUSTOMER_DB_USER`, `CUSTOMER_DB_PASSWORD`, `CUSTOMER_DB_NAME`. Richiede PHP 7.4 o successivo, mysqli/mysqlnd e directory temporanea PHP scrivibile per il rate limit persistente (5 tentativi/account e 100/IP ogni 15 minuti, compresi i login riusciti). Le sessioni durano 8 ore.

La tabella anagrafica reale è **`stazioni_meteo`**: qui si trova `customer_id` con FK verso `customers.id`. **`dati_stazioni` contiene le misurazioni e non viene modificata.** Le due API esistenti mantengono il loro comportamento; `stazioni_meteo.php` restituisce `customer_id` senza dipendere dalla vecchia colonna testuale `customer`. L'app recupera nome, descrizione, tipo, consenso e logo da `customer.php` tramite quell'ID.

## Relazioni SQL

Un cliente ha più stazioni; una stazione ha al massimo un cliente. Aggiungere `customer_id` **nell'anagrafica**, non su ogni riga di rilevazione. Le misurazioni continuano a riferirsi alla stazione con il campo `dati_stazioni.idStation` già esistente.

```sql
CREATE TABLE customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_name VARCHAR(255) NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  description TEXT NULL,
  project_type ENUM('professional', 'hobby', 'other') NULL,
  logo_url VARCHAR(2048) NULL,
  web_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Se già applicato, NON ripetere questa migrazione:
ALTER TABLE stazioni_meteo
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

Per migrare il campo testuale `customer`: creare un cliente per ogni identità verificata, assegnare `customer_id` alle stazioni, restituire solo `customer_id` nelle API stazioni e risolvere il profilo tramite `customer.php`. Non associare automaticamente clienti con stesso nome senza verificarli. La registrazione autonoma crea un account senza stazioni, con password generata tramite `password_hash($password, PASSWORD_DEFAULT)`. Gli assegnamenti delle stazioni si effettuano lato amministratore; il cliente non può cambiare `customer_id` né reclamare stazioni.

## Contratto di customer.php

Tutte le risposte JSON hanno `Content-Type: application/json; charset=utf-8` e `Cache-Control: no-store`. Tutti gli errori restituiscono uno status HTTP non 2xx e `{ "error": "..." }`; il frontend mostra messaggi generici. Non restituire HTML, redirect o messaggi SQL. Non serve CORS: PHP è chiamato dal server Next.js. Assicurarsi che il dominio senza `www` risponda direttamente, senza redirect; il proxy li rifiuta.

Il campo `customer` nelle risposte private è un oggetto:

```json
{
  "customer": {
    "id": 42,
    "name": "Cliente esempio",
    "project_name": "Osservatorio esempio",
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
| POST | `{"action":"register","name":"…","email":"…","password":"…","project_name":"…","description":"…"}` | Crea account senza stazioni e sessione; restituisce profilo, stazioni vuote e `token` |
| POST | `{"action":"consultation","message":"…"}` | Richiede sessione e salva richiesta consulenza; restituisce riferimento richiesta |
| POST | `{"action":"login","email":"…","password":"…"}` | Verifica credenziali, crea sessione, restituisce profilo, stazioni e `token` |
| GET | nessuno | Profilo e stazioni del cliente autenticato |
| PATCH | `{"name":"…","email":"…","description":"…","project_type":"hobby","logo_url":"https://…","web_public":false}` | Modifica questi campi e `project_name` del cliente autenticato; restituisce profilo e stazioni |
| POST | `{"action":"logout"}` | Revoca la sessione corrente; `200 {}` o `204` |
| DELETE | `{"password":"…"}` | Verifica di nuovo password, scollega stazioni, elimina cliente e tutte le sue sessioni; `200 {}` o `204` |

Tutte le richieste private tranne login e registrazione richiedono `Authorization: Bearer <token>`. Non leggere un ID dal body/query per decidere quale profilo modificare: usare esclusivamente il cliente risolto dalla sessione. `401` per credenziali/sessione/password errate, `422` per campi invalidi, `409` per email già registrata, `429` per rate limit, `405` per metodo non consentito.

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

PATCH: accettare una whitelist fissa, incluso `project_name` (opzionale, max 255 caratteri); rifiutare `id`, `customer_id`, `stations`, `password_hash`, `role` e campi non previsti. Limiti: nome 1–255 caratteri dopo trim, email valida max 254, descrizione max 5000, URL max 2048 con schema HTTPS, host presente e senza credenziali; tipo in enum o null; consenso strettamente booleano. Nessun fetch server del logo: si tratta di un URL pubblico renderizzato dal browser, non di upload. Preferire immagini raster pubbliche stabili. Email univoca con `409` in caso di conflitto. Non consentire PATCH della password in questo contratto. Verificare email nuova prima di usarla per eventuali futuri recuperi password.

```sql
UPDATE customers
SET name = ?, email = ?, description = ?, project_type = ?, logo_url = ?, web_public = ?
WHERE id = ?; -- ultimo parametro: customerId della sessione

SELECT id, nome FROM stazioni_meteo WHERE customer_id = ?;
```

DELETE: richiedere password e `password_verify`, poi transazione. Con FK la cancellazione cliente scollega stazioni e revoca sessioni. Se le FK non sono disponibili:

```php
$pdo->beginTransaction();
try {
    // Bloccare e rileggere cliente con SELECT ... FOR UPDATE,
    // poi verificare password dentro la transazione.
    $pdo->prepare('UPDATE stazioni_meteo SET customer_id = NULL WHERE customer_id = ?')->execute([$customerId]);
    $pdo->prepare('DELETE FROM customer_sessions WHERE customer_id = ?')->execute([$customerId]);
    $pdo->prepare('DELETE FROM customers WHERE id = ?')->execute([$customerId]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}
```

La vecchia colonna testuale `stazioni_meteo.customer` non viene selezionata dall’API aggiornata: i clienti si risolvono esclusivamente tramite `customer_id`. PATCH modifica la tabella `customers`; DELETE scollega le stazioni tramite `customer_id`, revoca le sessioni e rimuove il cliente in una transazione. Nessuna query elimina misurazioni.

## Profili pubblici per le stazioni

`GET /api/customer.php?public=true&id=42` restituisce `{ "customer": { ... } }`, oppure 404 se il cliente non esiste/non ha stazioni associate.

`GET /api/customer.php?public=true&ids=42,43` restituisce `{ "customers": [ ... ] }`. Massimo 100 ID interi positivi per chiamata; i clienti mancanti non compaiono nell'elenco. Nessun token richiesto. Solo questi campi possono comparire:

```json
{
  "id": 42,
  "name": "Cliente esempio",
  "description": "Il nostro osservatorio",
  "project_type": "hobby",
  "logo_url": "https://example.com/logo.png",
  "web_public": false
}
```

Email, password e sessioni rimangono esclusivamente nell'API privata. `web_public` continua a controllare solo l'indicizzazione: il profilo pubblico è leggibile anche con consenso false.

`stazioni_meteo.php` restituisce semplicemente `customer_id` sia in `stazioni` sia in `anagrafica`. Non serve JOIN alle tabelle clienti e non servono modifiche a `dati_stazioni.php`.

Il servizio `src/services/api.js` raccoglie gli ID distinti e risolve i profili a gruppi di 100. Sul server chiama direttamente AlterVista; la mappa nel browser passa da `/api/customer-profiles`, evitando CORS e filtrando qualsiasi campo privato imprevisto. Nome e logo vengono quindi usati dalla mappa, dall'anagrafica, dalle pagine cliente e dalla sitemap. L'area riservata usa `/api/customers` come proxy verso lo stesso **`customer.php` singolare**.

Se un profilo non esiste o il servizio clienti non risponde, i dati meteo restano disponibili e il cliente/logo non viene mostrato; nessun recupero del nome vecchio dalla colonna testuale. Le anagrafiche stazione possono restare in cache 5 minuti; le chiamate pubbliche della mappa sono in cache al massimo 60 secondi, l'area riservata non usa cache.

## Verifica prima della messa online

1. Fare backup e verificare nomi/tipi/tabelle reali; applicare migrazione su una copia.
2. Implementare PHP, creare account di prova e assegnare due stazioni.
3. Provare login errato/corretto, GET senza token, scadenza, logout e token revocato.
4. Provare PATCH di profilo/logo, email duplicata, URL non HTTPS e consenso; verificare risposta completa e aggiornamento delle API pubbliche.
5. Con due account provare di inviare ID dell'altro: deve essere rifiutato e non modificare dati altrui.
6. Provare cancellazione con password errata/corretta: cliente/sessioni spariscono, stazioni hanno customer_id NULL, misurazioni restano identiche, logo sparisce dopo cache.
7. Verificare in browser desktop/mobile le tre lingue, URL privati noindex e assenza di dati privati nelle risposte pubbliche.

Per chiamate manuali usare credenziali di test e un client HTTP; conservare il token solo per la durata della prova. Il file PHP è pronto da caricare ma non è stato distribuito da questa modifica.

## Aggiornamento: registrazione, consulenza e nome progetto

Prima di pubblicare il PHP aggiornato, eseguire una sola volta [php_tmp/customer-registration.sql](php_tmp/customer-registration.sql) sul database esistente: aggiunge `customers.project_name` e la tabella `customer_consultations`. Non ripetere la creazione delle tabelle clienti/sessioni già esistenti.

- `POST {"action":"register","name":"Mario Rossi","email":"…","password":"…","project_name":"Osservatorio","description":"…"}`: crea cliente e sessione in transazione, restituisce token/profilo e `stations: []`. Non accetta ruoli, ID stazioni, logo o consenso pubblico. Password minima 12 caratteri, massima 72 byte; email univoca, limite di 20 registrazioni/IP e 5/email ogni 15 minuti. Non è previsto l'invio automatico di una email di verifica o recupero password.
- I nuovi account vedono nel menu solo la consulenza per acquisto e configurazione di una stazione. Possono modificare dati account, nome/descrizione progetto e cancellare il proprio account; logo, tipo progetto, consenso e stazioni compaiono dopo l'associazione amministrativa di una stazione. Il PHP rifiuta le modifiche a logo/tipo/consenso per account senza stazioni.
- `POST {"action":"consultation","message":"Vorrei una stazione…"}` richiede Bearer token: salva una richiesta e restituisce profilo/stazioni e `consultation: {id, status:"new"}`. Massimo 5000 caratteri; 3 richieste/cliente e 100/IP ogni 15 minuti. Nessuna email automatica. Le richieste si consultano in phpMyAdmin con la SELECT inclusa nel file SQL; `status` può essere gestito amministrativamente. La cancellazione account rimuove anche le sue richieste.
- `project_name` è distinto da `name` (nome della persona/azienda), opzionale, max 255 caratteri. Compare nelle risposte private e pubbliche; la pagina progetto usa il nome progetto come titolo quando configurato. PATCH accetta `project_name` oltre a `description`.
- L'aiuto nell'area clienti mostra solo `elaborazione@emmeeffeservices.it` come testo, senza link alla pagina contatti né mailto. Il precedente indirizzo `mp@...` proveniva dalla pagina contatti meteo già presente nel repository.

Verificare su AlterVista: registrazione ed email duplicata, accesso automatico e successivo login, nessuna assegnazione stazione alla registrazione, PATCH dei soli campi account/progetto, rifiuto di modifiche logo senza stazioni, salvataggio consulenza ed eliminazione account. Gli endpoint delle misurazioni e l'API anagrafica stazioni non cambiano con questo aggiornamento.

Le pagine pubbliche usano `/meteo/customer/<id>` (ID del database, senza prefisso `id-`), con varianti `/meteo/en/customer/<id>` e `/meteo/de/customer/<id>`. Link in stazione/mappa, canonical e sitemap usano questi URL; i vecchi `/meteo/cliente/...` reindirizzano permanentemente quando il cliente è identificabile. Nome e logo nei dettagli stazione provengono dal profilo di `customer.php`, risolto tramite `customer_id`.

## Mappa vuota e anagrafica HTTP 500

Caricare anche la versione corretta di `php_tmp/stazioni_meteo.php`: non seleziona il vecchio campo `customer`, passa una variabile a `bind_param` nel dettaglio e restituisce JSON anche in caso di errore. Gli errori SQL dettagliati vengono registrati nel log PHP del server. Se l’API risponde ancora 500, verificare il log AlterVista e le colonne effettive di `stazioni_meteo`; `customer.php` non può compensare il mancato caricamento delle stazioni. Il frontend segnala gli errori della mappa e permette di riprovare.
