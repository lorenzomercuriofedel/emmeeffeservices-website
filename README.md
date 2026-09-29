# Emme-Effe Services e Meteo Piné

Applicazione Next.js con due sezioni:

- `/`: sito aziendale, convertito in JSX da `../emmeeffeservices-website`.
- `/meteo`: portale meteo in italiano.
- `/meteo/en` e `/meteo/de`: portale meteo in inglese e tedesco.

I layout radice separati mantengono indipendenti gli stili delle due sezioni.
Il cambio lingua e i link meteo usano i prefissi definiti in `src/i18n/routing.js`.
I vecchi indirizzi di contatti, stazioni e lingue hanno redirect permanenti.

## Avvio

Richiede Node.js 20.9 o successivo.

```sh
npm ci
npm run dev
npm run build
npm start
```

## Dominio

Collegare `emmeeffeservices.it` e `www.emmeeffeservices.it` allo stesso deployment
nelle impostazioni del provider e configurare i relativi record DNS.
Il codice reindirizza `www` al dominio canonico `https://emmeeffeservices.it`.
Impostare `NEXT_PUBLIC_SITE_URL=https://emmeeffeservices.it` in produzione.
L'indicizzazione del meteo e robots.txt seguono `VERCEL_ENV=production`.
Il sito necessita di un runtime Next.js: non è un export HTML statico.
