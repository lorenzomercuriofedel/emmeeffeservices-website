# API: clienti e progetti meteo

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
