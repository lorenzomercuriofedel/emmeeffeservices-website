import test from 'node:test';
import assert from 'node:assert/strict';
import { getCustomer, groupCustomers, customerPath, customerDescription, findCustomerByRouteId } from '../src/utils/customers.js';
import { languageHref } from '../src/i18n/site-language.js';

test('missing customer never falls back to the land owner or operator', () => {
  assert.equal(getCustomer({ propr_terreno: 'Gestore', desc_gestori: 'Owner' }), null);
  assert.equal(getCustomer({ customer: '  ' }), null);
});
test('groups by stable customer ID and keeps all stations', () => {
  const stations = [
    { id: 1, customer: { id: 42, name: 'Cliente A' } },
    { id: 2, customer: { id: 42, name: 'Cliente A', project_type: 'hobby', description: { it: 'Progetto', en: 'Project' } } },
    { id: 3, customer: { id: 43, name: 'Cliente A' } },
    { id: 4 },
  ];
  const groups = groupCustomers(stations);
  assert.equal(groups.length, 2);
  const first = groups.find((group) => group.id === 'id-42');
  assert.deepEqual(first.stations.map((station) => station.id), [1, 2]);
  assert.equal(first.projectType, 'hobby');
  assert.equal(customerDescription(first, 'en'), 'Project');
  assert.equal(customerDescription(first, 'de'), 'Progetto');
});
test('supports string customers, safe URLs and unknown project types', () => {
  const customer = getCustomer({ customer: 'A & B / Piné', customer_project_type: 'unexpected' });
  assert.equal(customer.projectType, null);
  assert.equal(decodeURIComponent(customerPath(customer).split('/')[2]), customer.id);
  assert.notEqual(getCustomer({ customer: 'Piné' }).id, getCustomer({ customer: 'Pine' }).id);
});
test('switching weather language preserves station, query and fragment', () => {
  assert.equal(languageHref('/meteo/en/stazione/1', '?range=24h', 'de', '#grafici'), '/meteo/de/stazione/1?range=24h#grafici');
  assert.equal(languageHref('/meteo/de', '', 'it'), '/meteo');
  assert.equal(languageHref('/meteo/cliente/id-42', '', 'en'), '/meteo/en/cliente/id-42');
});
test('root and future sections use the same language convention', () => {
  assert.equal(languageHref('/', '?lang=it', 'en', '#contatti'), '/?lang=en#contatti');
  assert.equal(languageHref('/servizio-futuro', '?lang=en&view=map', 'de'), '/servizio-futuro?view=map&lang=de');
  assert.equal(languageHref('/', '?lang=de', 'it'), '/');
});

test('textual API customers group stations and remain the displayed source of truth', () => {
  const stations = [
    { id: 1, customer: 'Progetto locale', customer_name: 'Stale name' },
    { id: 2, customer: 'Progetto locale' },
    { id: 3, customer: ' Progetto locale ' },
    { id: 4, customer: 'Altro progetto' },
  ];
  const group = groupCustomers(stations).find((customer) => customer.name === 'Progetto locale');
  assert.deepEqual(group.stations.map((station) => station.id), [1, 2, 3]);
  assert.equal(group.id, 'name-Progetto locale');
  assert.equal(group.projectType, null);
});

test('resolves customer routes with spaces, accents and punctuation', () => {
  const groups = groupCustomers([{ id: 1, customer: 'Progetto Piné (TN)' }]);
  const id = groups[0].id;
  assert.equal(findCustomerByRouteId(groups, encodeURIComponent(id)), groups[0]);
  assert.equal(findCustomerByRouteId(groups, id), groups[0]);
  assert.equal(findCustomerByRouteId(groups, 'missing'), undefined);
});
