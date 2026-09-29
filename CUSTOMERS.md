# API: clienti e progetti meteo

## Formato attuale: customer testuale

L'API attuale espone `customer` come stringa. Il frontend usa quel testo come
nome pubblico, lo mostra sotto la proprietà del terreno e raggruppa le stazioni
con lo stesso valore (ignorando gli spazi iniziali e finali). Il nome non viene
sostituito con il marchio del portale. Descrizione e categoria restano assenti
finché non vengono fornite dall'API.

## Tabella consigliata

Per un progetto per cliente, è sufficiente una tabella `customers`:

| Campo | Tipo indicativo | Uso |
| --- | --- | --- |
| `id` | BIGINT, chiave primaria | Identificatore stabile |
| `name` | VARCHAR(255), obbligatorio | Nome pubblico del cliente |
| `description` | TEXT, nullable | Descrizione del progetto |
| `project_type` | VARCHAR(20), nullable | `professional`, `hobby`, `other` |

Nella tabella delle stazioni aggiungere `customer_id`, nullable, indicizzato e
collegato a `customers.id` con una chiave esterna. Un cliente può avere più
stazioni; ciascuna stazione è associata a un cliente. In caso di cancellazione
cliente preferire il blocco o SET NULL, senza eliminare le stazioni.

Durante la migrazione mantenere nell'API `customer` come testo tramite una JOIN
sul nome cliente e aggiungere `customer_id`, `customer_description` e
`customer_project_type`. Il frontend supporta già questo formato. Non cambiare
subito `customer` in numero: il testo è usato anche da collegamenti esistenti.
Gli URL basati sul nome richiederanno redirect quando si adotteranno gli ID.

Se uno stesso cliente può avere progetti distinti, usare da subito anche
`projects(id, customer_id, name, description, project_type)` e collegare ogni
stazione con `project_id`: descrizione e categoria appartengono al progetto,
non necessariamente al cliente. Questa variante richiede di estendere l'API e
la pagina cliente per mostrare più progetti.

Il backend PHP/database non è in questo repository. Il frontend legge il nuovo
campo `customer` da `stazioni_meteo.php`, sia nell'elenco sia nell'anagrafica.
Il filtro della mappa richiede il campo nell'elenco; le pagine cliente recuperano
anche le anagrafiche se l'elenco non lo include.

Formato consigliato (dati di esempio, non associati alle stazioni reali):

```json
{
  "id": 123,
  "nome": "Stazione di esempio",
  "propr_terreno": "Proprietario del terreno",
  "customer": {
    "id": "cliente-42",
    "name": "Cliente di esempio",
    "description": {
      "it": "Descrizione del progetto",
      "en": "Project description",
      "de": "Projektbeschreibung"
    },
    "project_type": "professional"
  }
}
```

`project_type`: `professional`, `hobby` oppure `other`. Se assente, nessuna
categoria viene attribuita. `description` può essere anche un semplice testo.
Usare lo stesso ID per tutte le stazioni dello stesso cliente.

È supportato anche `customer: "Nome cliente"`. In questo caso si possono inviare
`customer_id`, `customer_name`, `customer_description`, `customer_project_type`
come campi dell'anagrafica. Un valore numerico richiede `customer_name` per
mostrare un nome invece dell'identificatore. Un campo vuoto resta non assegnato;
il proprietario del terreno non viene mai usato come cliente implicito.

Le pagine sono pubbliche: `/meteo/cliente/<identificatore codificato>`, con
prefissi `/meteo/en` e `/meteo/de` per le altre lingue. Il collegamento viene
costruito dal frontend. Il prefisso `id-` identifica un ID stabile, `name-` un
nome usato come identificatore provvisorio; quando si passa da nome a ID gli URL
cambiano, quindi conviene fornire subito l'ID definitivo.

Le lingue della sezione meteo conservano gli URL attuali. La pagina aziendale e
le future sezioni senza routing specifico usano `?lang=en` o `?lang=de`.
La navbar è comune; le future sezioni devono usare NextIntlClientProvider e il
locale risolto dal middleware per integrare il selettore.

## Consenso all'indicizzazione

Aggiungere `customer_web_public` (BOOLEAN/TINYINT, NOT NULL, DEFAULT 0) alla
anagrafica clienti; finché `customer` è testuale, restituire lo stesso valore
per tutte le stazioni del cliente sia nell'elenco sia nel dettaglio API.
Sono accettati come consenso `true`, `1`, `"1"`, `"true"`; ogni altro valore,
compreso un campo assente, nega l'indicizzazione.

In produzione, solo i clienti con consenso esplicito su tutte le loro stazioni
hanno `index, follow` e sono inclusi nella sitemap nelle tre lingue. Valori
incoerenti non abilitano l'indicizzazione. Preview e sviluppo restano noindex.
Pagina e sitemap leggono i dati aggiornati senza cache persistente; il motore
di ricerca applicherà le modifiche quando visiterà nuovamente la pagina.

Il campo controlla l'indicizzazione: le pagine senza consenso restano visitabili
tramite URL con `noindex, nofollow`. Non sono aree private e non viene aggiunta
alcuna autenticazione o gestione delle stazioni in questa modifica.
