/**
 * Calcolo alba/tramonto/durata giorno e fase lunare per coordinate locali.
 * Approssimazione astronomica accurata a ±5 min — sufficiente per uso visivo/divulgativo.
 * Default: Altopiano di Piné (lat 46.14, lng 11.26, fuso CET/CEST).
 */

const PINE_LAT = 46.14;
const PINE_LNG = 11.26;

function dayOfYear(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86400000);
}

/** Ritorna { sunrise, sunset, dayLengthHours } in ore decimali (locali). */
export function getSunTimes(date = new Date(), lat = PINE_LAT, lng = PINE_LNG, timeZone) {
  const parts = timeZone ? zonedParts(date, timeZone) : null;
  const N = parts
    ? Math.floor((Date.UTC(parts.year, parts.month - 1, parts.day) - Date.UTC(parts.year, 0, 0)) / 86400000)
    : dayOfYear(date);
  // Declination
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (N + 10)) * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const cosH = -Math.tan(latRad) * Math.tan(decl);

  if (cosH > 1) return { sunrise: null, sunset: null, dayLengthHours: 0 }; // sole sotto sempre
  if (cosH < -1) return { sunrise: 0, sunset: 24, dayLengthHours: 24 };  // sole sopra sempre

  const H = Math.acos(cosH) * 12 / Math.PI; // mezzanotte solare → ore
  const solarNoonUTC = 12 - lng / 15;
  const sunriseUTC = solarNoonUTC - H;
  const sunsetUTC = solarNoonUTC + H;

  // Conversione UTC → locale (usa offset corrente del Date passato)
  const tzOffset = parts
    ? (Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(date.getTime() / 1000) * 1000) / 3600000
    : -date.getTimezoneOffset() / 60;
  const sunrise = (sunriseUTC + tzOffset + 24) % 24;
  const sunset = (sunsetUTC + tzOffset + 24) % 24;

  return {
    sunrise,
    sunset,
    dayLengthHours: (H * 2),
  };
}

/** Formatta ore decimali in HH:MM */
export function formatHM(hours) {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) return `${String(h + 1).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(hours) {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Fase lunare 0..1 (0=nuova, 0.5=piena). Riferimento: nuova luna del 6 gen 2000 18:14 UTC. */
export function getMoonPhase(date = new Date()) {
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const diff = date.getTime() - known;
  const synodic = 29.530588853 * 86400000;
  return ((diff % synodic) / synodic + 1) % 1;
}

export function getMoonInfo(date = new Date()) {
  const phase = getMoonPhase(date);
  const index = Math.floor(((phase + 1 / 16) % 1) * 8); // arrotonda alla fase più vicina
  // `index` (0..7) viene tradotto a livello di componente via messaggi `moon.<index>`.
  return { phase, index };
}

/** Ritorna chiave per il gradiente cielo in base all'ora locale rispetto ad alba/tramonto. */
export function getSkyKey(date = new Date(), sunrise, sunset, timeZone) {
  const parts = timeZone ? zonedParts(date, timeZone) : null;
  const h = parts ? parts.hour + parts.minute / 60 : date.getHours() + date.getMinutes() / 60;
  if (sunrise == null || sunset == null) return 'sky-noon';

  if (h < sunrise - 1) return 'sky-night';
  if (h < sunrise - 0.25) return 'sky-predawn';
  if (h < sunrise + 0.75) return 'sky-dawn';
  if (h < (sunrise + sunset) / 2 - 0.5) return 'sky-morning';
  if (h < sunset - 1.5) return 'sky-noon';
  if (h < sunset - 0.5) return 'sky-afternoon';
  if (h < sunset + 0.5) return 'sky-sunset';
  if (h < sunset + 1.5) return 'sky-dusk';
  return 'sky-night';
}

export function isNightSky(skyKey) {
  return skyKey === 'sky-night' || skyKey === 'sky-predawn' || skyKey === 'sky-dusk';
}

function zonedParts(date, timeZone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}
