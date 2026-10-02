import { customerRobots, weatherTitle, SITE_TITLE } from '../src/utils/seo.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCustomer, groupCustomers, customerPath, customerDescription, findCustomerByRouteId, safeLogoUrl } from '../src/utils/customers.js';
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

test('customer indexing requires explicit consent on every station', () => {
  for (const value of [undefined, null, false, 0, '0', 'false', '', 'yes']) {
    const customer = getCustomer({ customer: 'Example', customer_web_public: value });
    assert.equal(customer.webPublic, false);
    assert.equal(customerRobots(customer, true).index, false);
  }
  for (const value of [true, 1, '1', 'true']) {
    const customer = getCustomer({ customer: 'Example', customer_web_public: value });
    assert.equal(customerRobots(customer, true).index, true);
    assert.equal(customerRobots(customer, false).index, false);
  }
  const stations = [{ customer: 'Example', customer_web_public: 1 }, { customer: 'Example', customer_web_public: 0 }];
  assert.equal(groupCustomers(stations)[0].webPublic, false);
  assert.equal(groupCustomers([...stations].reverse())[0].webPublic, false);
  assert.equal(groupCustomers(stations.map(s => ({ ...s, customer_web_public: 1 })))[0].webPublic, true);
});
test('weather titles share the root branding', () => {
  assert.equal(weatherTitle(), `Meteo | ${SITE_TITLE}`);
  assert.equal(weatherTitle('Miola'), `Miola | Meteo | ${SITE_TITLE}`);
});

test('customer logos accept HTTPS and reject unsafe or malformed URLs', () => {
  for (const value of [null, '', 'javascript:alert(1)', 'data:image/png;base64,abc', 'http://example.com/logo.png', '/logo.png', 'https://user:pass@example.com/logo.png']) assert.equal(safeLogoUrl(value), null);
  assert.equal(getCustomer({ customer: 'Example', customer_logo_url: 'https://example.com/logo.png' }).logoUrl, 'https://example.com/logo.png');
  assert.equal(getCustomer({ customer: { id: 42, name: 'Example', logo_url: 'https://example.com/nested.png' } }).logoUrl, 'https://example.com/nested.png');
  assert.equal(getCustomer({ customer: 'Example' }).logoUrl, null);
});
