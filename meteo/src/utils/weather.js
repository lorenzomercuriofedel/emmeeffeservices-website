export function getTemperatureColor(value) {
  if (value === 'off' || value === null || value === undefined) return '#9ca3af';
  const v = parseFloat(value);
  if (isNaN(v)) return '#9ca3af';
  if (v <= -10) return '#7c3aed';
  if (v < 0) return '#1e3a5f';
  if (v < 5) return '#2563eb';
  if (v < 10) return '#06b6d4';
  if (v < 15) return '#86efac';
  if (v < 20) return '#fde047';
  if (v < 25) return '#fdba74';
  if (v < 30) return '#fb923c';
  if (v < 40) return '#ef4444';
  return '#991b1b';
}

export function formatDateTime(rawDate) {
  if (!rawDate) return '';
  const [datePart, timePart] = rawDate.split(' ');
  const [y, m, d] = datePart.split('-');
  const [h, min] = timePart.split(':');
  return `${h}:${min} ${d}/${m}/${y.slice(-2)}`;
}

export function isStationOnline(dateTime, stationId) {
  if (!dateTime) return false;
  const lastDataTime = new Date(dateTime);
  const now = new Date();
  const diffMinutes = (now - lastDataTime) / (1000 * 60);
  if (stationId === 4) return diffMinutes <= 180;
  return diffMinutes <= 3;
}

// Soglia "live" usata nella pagina stazione (più larga di isStationOnline).
// Condivisa server/client per renderizzare il badge in SSR senza hydration mismatch.
export function isStationLive(dateTime, stationId) {
  if (!dateTime) return false;
  const diffMin = (Date.now() - new Date(dateTime).getTime()) / (1000 * 60);
  return parseInt(stationId) === 4 ? diffMin <= 180 : diffMin <= 24 * 60 + 20;
}

export function getYesterdayDateString(dateTime) {
  const [datePart, timePart] = dateTime.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min, s] = timePart.split(':').map(Number);
  const dt = new Date(y, m - 1, d, h, min, s);
  dt.setDate(dt.getDate() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// Abbreviazioni dei punti cardinali per lingua (il simbolo API è in inglese).
// IT/DE usano "O"/"Ost" → la O ha significati diversi (Ovest vs Ost), quindi mappe distinte.
const WIND_ABBR = {
  it: {
    N: 'N', NNE: 'NNE', NE: 'NE', ENE: 'ENE',
    E: 'E', ESE: 'ESE', SE: 'SE', SSE: 'SSE',
    S: 'S', SSW: 'SSO', SW: 'SO', WSW: 'OSO',
    W: 'O', WNW: 'ONO', NW: 'NO', NNW: 'NNO',
  },
  en: {
    N: 'N', NNE: 'NNE', NE: 'NE', ENE: 'ENE',
    E: 'E', ESE: 'ESE', SE: 'SE', SSE: 'SSE',
    S: 'S', SSW: 'SSW', SW: 'SW', WSW: 'WSW',
    W: 'W', WNW: 'WNW', NW: 'NW', NNW: 'NNW',
  },
  de: {
    N: 'N', NNE: 'NNO', NE: 'NO', ENE: 'ONO',
    E: 'O', ESE: 'OSO', SE: 'SO', SSE: 'SSO',
    S: 'S', SSW: 'SSW', SW: 'SW', WSW: 'WSW',
    W: 'W', WNW: 'WNW', NW: 'NW', NNW: 'NNW',
  },
};

export function formatWindBearing(symbol, locale = 'it') {
  if (!symbol) return '';
  const map = WIND_ABBR[locale] || WIND_ABBR.it;
  return map[symbol] || symbol;
}
