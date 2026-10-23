# Emme-Effe Services

Sito aziendale Next.js in italiano, inglese e tedesco. La lingua è selezionata tramite `?lang=en` o `?lang=de`.

## Avvio

Richiede Node.js 20.9 o successivo.

```sh
npm ci
npm run dev
npm run build
npm start
```

## Consulenze

Il pulsante di richiesta consulenza apre un popup con i contatti email e WhatsApp presenti anche nel footer.

## Dominio

Collegare `emmeeffeservices.it` e `www.emmeeffeservices.it` allo stesso deployment.
Impostare `NEXT_PUBLIC_SITE_URL=https://emmeeffeservices.it` in produzione.
Il sito necessita di un runtime Next.js.

L’area meteo è stata rimossa: il relativo sito è gestito separatamente su meteopine.it.
