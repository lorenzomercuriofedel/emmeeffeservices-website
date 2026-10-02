import { normalizeCustomerIds, fetchPublicCustomerProfiles, attachCustomerProfiles } from './customer-profiles.js';

const API_BASE = 'https://meteopine.altervista.org/api';

async function readApiJson(response) {
  if (!response.ok) throw new Error(`Weather API returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchStations(options = { next: { revalidate: 60 } }) {
  const res = await fetch(`${API_BASE}/stazioni_meteo.php?all=true&disabled=false`, options);
  const data = await readApiJson(res);
  if (!Array.isArray(data?.stazioni)) throw new Error('Invalid station registry response');
  return enrichCustomers(data.stazioni, options);
}

export async function fetchStationInfo(id, options = { cache: 'no-store' }) {
  const res = await fetch(`${API_BASE}/stazioni_meteo.php?id=${id}`, options);
  const data = await readApiJson(res);
  if (!data.anagrafica || [true, 1, '1'].includes(data.anagrafica.disabled)) return null;
  return (await enrichCustomers([data.anagrafica], options))[0];
}

export async function fetchLastData(id, opts = { cache: 'no-store' }) {
  const res = await fetch(`${API_BASE}/dati_stazioni.php?id=${id}&last=true`, opts);
  const data = await readApiJson(res);
  return data.estrazione?.[0] ?? null;
}

export async function fetchDataRange(id, dateStart, dateEnd) {
  const res = await fetch(
    `${API_BASE}/dati_stazioni.php?id=${id}&di=${encodeURIComponent(dateStart)}&df=${encodeURIComponent(dateEnd)}`,
    { cache: 'no-store' }
  );
  const data = await readApiJson(res);
  return data.estrazione ?? [];
}

export async function fetchDailyExtremes(id) {
  const res = await fetch(`${API_BASE}/dati_stazioni.php?daily=true&id=${id}`, { cache: 'no-store' });
  return readApiJson(res);
}

// Resolve each distinct customer once per batch, for SSR and browser consumers.
async function enrichCustomers(stations, options) {
  const ids = normalizeCustomerIds(stations.map(station => station.customer_id));
  if (!ids.length) return attachCustomerProfiles(stations, []);
  const chunks = [];
  for (let offset = 0; offset < ids.length; offset += 100) chunks.push(ids.slice(offset, offset + 100));
  const profiles = await Promise.all(chunks.map(async chunk => {
    try {
      if (typeof window === 'undefined') return await fetchPublicCustomerProfiles(chunk, options);
      const response = await fetch(`/api/customer-profiles?ids=${chunk.join(',')}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Customer profiles unavailable');
      const data = await response.json();
      if (!Array.isArray(data.customers)) throw new Error('Invalid customer profiles');
      return data.customers;
    } catch {
      // Weather remains available; never fall back to a stale customer name/consent.
      return [];
    }
  }));
  return attachCustomerProfiles(stations, profiles.flat());
}

// Customer metadata and sitemap eligibility always use fresh public profiles.
export async function fetchCustomerStations() {
  return fetchStations({ cache: 'no-store' });
}
