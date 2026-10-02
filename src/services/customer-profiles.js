const ENDPOINT = 'https://meteopine.altervista.org/api/customer.php';
const PUBLIC_FIELDS = ['id', 'name', 'description', 'project_type', 'logo_url', 'web_public'];

export function normalizeCustomerIds(ids) {
  return [...new Set(ids.map(String).filter(id => /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 4294967295))];
}

// Strip any unexpected private fields, even if the upstream accidentally sends them.
export async function fetchPublicCustomerProfiles(ids, options = { next: { revalidate: 60 } }) {
  const unique = normalizeCustomerIds(ids);
  if (!unique.length) return [];
  if (unique.length > 100) throw new Error('Too many customer IDs');
  const response = await fetch(`${ENDPOINT}?public=true&ids=${unique.join(',')}`, { ...options, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error('Customer profiles unavailable');
  const data = await response.json();
  if (!Array.isArray(data.customers)) throw new Error('Invalid customer profiles');
  return data.customers.filter(customer => customer && unique.includes(String(customer.id)) && typeof customer.name === 'string')
    .map(customer => Object.fromEntries(PUBLIC_FIELDS.filter(field => Object.hasOwn(customer, field)).map(field => [field, customer[field]])));
}

export function attachCustomerProfiles(stations, profiles) {
  const customers = new Map(profiles.map(customer => [String(customer.id), customer]));
  return stations.map(station => {
    // Keep compatibility only for APIs that have not migrated to customer_id yet.
    if (!Object.hasOwn(station, 'customer_id')) return station;
    const clean = { ...station };
    for (const key of ['customer', 'customer_name', 'customer_description', 'customer_project_type', 'customer_logo_url', 'customer_web_public']) delete clean[key];
    const customer = customers.get(String(station.customer_id));
    return { ...clean, customer: customer ?? null };
  });
}
