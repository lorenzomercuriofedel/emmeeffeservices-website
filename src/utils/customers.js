// Public customer fields supplied by the station API. Never infer a customer from land ownership.
export function getCustomer(station) {
  const value = station?.customer;
  if (value == null || value === '') return null;
  const object = typeof value === 'object' && !Array.isArray(value) ? value : {};
  const scalar = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const name = String(object.name ?? station.customer_name ?? scalar).trim();
  const identity = String(object.id ?? station.customer_id ?? name).trim();
  if (!name || !identity) return null;
  // Keep the full identity, including accents and punctuation, to avoid slug collisions.
  const id = `${object.id != null || station.customer_id != null ? 'id' : 'name'}-${identity}`;
  const rawType = object.project_type ?? station.customer_project_type;
  return {
    id,
    name,
    description: object.description ?? station.customer_description ?? null,
    projectType: ['professional', 'hobby', 'other'].includes(rawType) ? rawType : null,
  };
}

export function customerPath(customer) {
  return `/cliente/${encodeURIComponent(customer.id)}`;
}

export function groupCustomers(stations) {
  const groups = new Map();
  for (const station of stations) {
    const customer = getCustomer(station);
    if (!customer) continue;
    const group = groups.get(customer.id);
    if (group) {
      group.stations.push(station);
      group.description ||= customer.description;
      group.projectType ||= customer.projectType;
    } else groups.set(customer.id, { ...customer, stations: [station] });
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function customerDescription(customer, locale) {
  if (typeof customer.description === 'string') return customer.description;
  return customer.description?.[locale] ?? customer.description?.it ?? '';
}
