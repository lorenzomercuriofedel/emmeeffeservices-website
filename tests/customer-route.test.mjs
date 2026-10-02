import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupCustomers, findCustomerByRouteId, customerPath } from '../src/utils/customers.js';

const source = readFileSync(new URL('../app/(weather)/[locale]/cliente/[id]/page.jsx', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export default ', '');
function legacyPage(stations) {
  return new Function('notFound', 'permanentRedirect', 'fetchCustomerStations', 'groupCustomers', 'findCustomerByRouteId', 'customerPath', `${source}\nreturn LegacyCustomerPage;`)(
    () => { throw new Error('NOT_FOUND'); }, path => { throw new Error(`REDIRECT:${path}`); },
    async () => stations, groupCustomers, findCustomerByRouteId, customerPath);
}
test('old stable customer links redirect to the database ID in every language', async () => {
  const page = legacyPage([{ id: 1, customer_id: 42, customer: { id: 42, name: 'Example' } }]);
  for (const locale of ['it', 'en', 'de']) {
    const prefix = locale === 'it' ? '/meteo' : `/meteo/${locale}`;
    await assert.rejects(page({ params: Promise.resolve({ locale, id: 'id-42' }) }), { message: `REDIRECT:${prefix}/customer/42` });
  }
});
test('old name links resolve unique names but never choose an ambiguous customer', async () => {
  const first = { id: 1, customer_id: 42, customer: { id: 42, name: 'Piné' } };
  await assert.rejects(legacyPage([first])({ params: Promise.resolve({ locale: 'it', id: encodeURIComponent('name-Piné') }) }), { message: 'REDIRECT:/meteo/customer/42' });
  const duplicate = { id: 2, customer_id: 43, customer: { id: 43, name: 'Piné' } };
  await assert.rejects(legacyPage([first, duplicate])({ params: Promise.resolve({ locale: 'it', id: encodeURIComponent('name-Piné') }) }), { message: 'NOT_FOUND' });
});
