/**
 * Wrapper per Open-Meteo (https://open-meteo.com/) — API meteo pubblica, free, no API key.
 * Restituisce le condizioni meteo correnti (WMO weather code) per coordinate date.
 */

const PINE_LAT = 46.14;
const PINE_LNG = 11.26;

export async function fetchOpenMeteoCurrent(lat = PINE_LAT, lng = PINE_LNG) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'weather_code,is_day');
  url.searchParams.set('timezone', 'Europe/Rome');

  // revalidate: lato server la risposta è cachata 30 min (come il refresh client); lato client è ignorato.
  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const cur = data.current || {};
  return {
    weatherCode: cur.weather_code,
    isDay: cur.is_day === 1,
    time: cur.time,
  };
}

/**
 * Mappa WMO weather code → nome icona Meteocons (Bas Milius).
 * Set: https://github.com/basmilius/weather-icons (production/fill/svg/<name>.svg)
 * WMO docs: https://open-meteo.com/en/docs#weathervariables
 */
export function wmoToIcon(code, isDay = true) {
  const day = isDay ? 'day' : 'night';
  if (code == null) return `clear-${day}`;

  const c = Number(code);

  // 0 = sereno
  if (c === 0) return `clear-${day}`;
  // 1 = prevalentemente sereno
  if (c === 1) return `clear-${day}`;
  // 2 = parzialmente nuvoloso
  if (c === 2) return `partly-cloudy-${day}`;
  // 3 = coperto
  if (c === 3) return `overcast-${day}`;
  // 45, 48 = nebbia (48 = nebbia con brina, ma stesso visual)
  if (c === 45 || c === 48) return `fog-${day}`;
  // 51, 53, 55 = pioggerella → drizzle
  if (c === 51 || c === 53 || c === 55) return `partly-cloudy-${day}-drizzle`;
  // 56, 57 = pioggerella gelata → sleet
  if (c === 56 || c === 57) return `partly-cloudy-${day}-sleet`;
  // 61 = pioggia leggera (intermittente)
  if (c === 61) return `partly-cloudy-${day}-rain`;
  // 63 = pioggia moderata
  if (c === 63) return 'rain';
  // 65 = pioggia forte
  if (c === 65) return 'rain';
  // 66, 67 = pioggia gelata
  if (c === 66 || c === 67) return 'sleet';
  // 71 = neve leggera
  if (c === 71) return `partly-cloudy-${day}-snow`;
  // 73, 75, 77 = neve moderata/forte/granuli
  if (c === 73 || c === 75 || c === 77) return 'snow';
  // 80, 81 = rovesci pioggia leggeri/moderati
  if (c === 80 || c === 81) return `partly-cloudy-${day}-rain`;
  // 82 = rovesci violenti
  if (c === 82) return 'rain';
  // 85, 86 = rovesci di neve
  if (c === 85 || c === 86) return `partly-cloudy-${day}-snow`;
  // 95 = temporale
  if (c === 95) return `thunderstorms-${day}`;
  // 96, 99 = temporale con grandine
  if (c === 96 || c === 99) return `thunderstorms-${day}-extreme`;

  return `partly-cloudy-${day}`;
}

// Le etichette testuali dei codici WMO sono localizzate nei dizionari (messages/*.json → "wmo").
