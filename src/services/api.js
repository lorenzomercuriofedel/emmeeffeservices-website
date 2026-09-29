const API_BASE = 'https://www.meteopine.altervista.org/api';

export async function fetchStations(options = { next: { revalidate: 60 } }) {
  const res = await fetch(`${API_BASE}/stazioni_meteo.php?all=true&disabled=false`, options);
  const data = await res.json();
  return data.stazioni;
}

export async function fetchStationInfo(id, options = { next: { revalidate: 300 } }) {
  const res = await fetch(`${API_BASE}/stazioni_meteo.php?id=${id}`, options);
  const data = await res.json();
  return data.anagrafica;
}

export async function fetchLastData(id, opts = { cache: 'no-store' }) {
  const res = await fetch(`${API_BASE}/dati_stazioni.php?id=${id}&last=true`, opts);
  const data = await res.json();
  return data.estrazione?.[0] ?? null;
}

export async function fetchDataRange(id, dateStart, dateEnd) {
  const res = await fetch(
    `${API_BASE}/dati_stazioni.php?id=${id}&di=${encodeURIComponent(dateStart)}&df=${encodeURIComponent(dateEnd)}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  return data.estrazione ?? [];
}

export async function fetchDailyExtremes(id) {
  const res = await fetch(`${API_BASE}/dati_stazioni.php?daily=true&id=${id}`, { cache: 'no-store' });
  return res.json();
}

// Shared fresh registry for customer metadata and sitemap eligibility.
export async function fetchCustomerStations() {
  const stations = await fetchStations({ cache: 'no-store' });
  return Promise.all(stations.map(async (station) => {
    if (Object.hasOwn(station, 'customer') && Object.hasOwn(station, 'customer_web_public')) return station;
    const details = await fetchStationInfo(station.id, { cache: 'no-store' });
    return { ...station, ...details };
  }));
}
