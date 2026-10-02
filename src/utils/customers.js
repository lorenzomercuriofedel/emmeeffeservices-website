// Public customer profiles resolved from customer.php using station.customer_id. Never infer a customer from land ownership.
export function getCustomer(station) {
  const value = station?.customer;
  if (value == null || value === '') return null;
  const object = typeof value === 'object' && !Array.isArray(value) ? value : {};
  const scalar = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  // The service attaches the current public profile; strings are legacy compatibility.
  const name = typeof value === 'string' ? scalar : String(object.name ?? station.customer_name ?? scalar).trim();
  const identity = String(object.id ?? station.customer_id ?? name).trim();
  if (!name || !identity) return null;
  // Keep the full identity, including accents and punctuation, to avoid slug collisions.
  const id = `${object.id != null || station.customer_id != null ? 'id' : 'name'}-${identity}`;
  const rawType = object.project_type ?? station.customer_project_type;
  return {
    id,
    routeId: String(object.id ?? station.customer_id ?? id),
    name,
    contactEmail: typeof object.contact_email === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(object.contact_email) ? object.contact_email : null,
    websiteUrl: safeLogoUrl(object.website_url),
    projectName: typeof object.project_name === 'string' ? object.project_name.trim() : '',
    logoUrl: safeLogoUrl(object.logo_url ?? station.customer_logo_url),
    webPublic: hasWebConsent(station.customer_web_public ?? object.web_public),
    description: object.description ?? station.customer_description ?? null,
    projectType: ['professional', 'hobby', 'other'].includes(rawType) ? rawType : null,
  };
}

export function customerPath(customer) {
  return `/customer/${encodeURIComponent(customer.routeId ?? customer.id)}`;
}

export function groupCustomers(stations) {
  const groups = new Map();
  for (const station of stations) {
    const customer = getCustomer(station);
    if (!customer) continue;
    const group = groups.get(customer.id);
    if (group) {
      group.stations.push(station);
      group.webPublic = group.webPublic && customer.webPublic;
      group.projectName ||= customer.projectName;
      group.description ||= customer.description;
      group.projectType ||= customer.projectType;
    } else groups.set(customer.id, { ...customer, stations: [station] });
  }
  return [...groups.values()].sort((a, b) => customerDisplayName(a).localeCompare(customerDisplayName(b)));
}

export function customerDescription(customer, locale) {
  if (typeof customer.description === 'string') return customer.description;
  return customer.description?.[locale] ?? customer.description?.it ?? '';
}

export function findCustomerByRouteId(customers, id) {
  // Next route params can retain percent encoding after the locale rewrite.
  return customers.find((customer) => encodeURIComponent(customer.routeId ?? customer.id) === id)
    ?? customers.find((customer) => (customer.routeId ?? customer.id) === id)
    ?? customers.find((customer) => encodeURIComponent(customer.id) === id)
    ?? customers.find((customer) => customer.id === id);
}

// Explicit opt-in only. Strings such as "0" or "false" are not truthy consent.
export function hasWebConsent(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

// Only absolute HTTPS images; reject credentials and script/data URLs.
export function safeLogoUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function customerDisplayName(customer) {
  return customer?.projectType === 'hobby' && customer.projectName?.trim()
    ? customer.projectName.trim() : customer?.name ?? '';
}
