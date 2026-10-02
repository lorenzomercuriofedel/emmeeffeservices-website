import { notFound, permanentRedirect } from 'next/navigation';
import { fetchCustomerStations } from '@/src/services/api';
import { groupCustomers, findCustomerByRouteId, customerPath } from '@/src/utils/customers';

export default async function LegacyCustomerPage({ params }) {
  const { locale, id } = await params;
  const customers = groupCustomers(await fetchCustomerStations());
  let customer = findCustomerByRouteId(customers, id);
  // Resolve old name-based URLs only when the current name is unambiguous.
  if (!customer) {
    const matches = customers.filter(item => `name-${item.name}` === id || encodeURIComponent(`name-${item.name}`) === id);
    if (matches.length === 1) customer = matches[0];
  }
  if (!customer) notFound();
  permanentRedirect(`${locale === 'it' ? '/meteo' : `/meteo/${locale}`}${customerPath(customer)}`);
}
