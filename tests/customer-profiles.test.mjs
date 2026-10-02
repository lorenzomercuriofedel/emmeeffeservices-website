import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCustomerIds, attachCustomerProfiles, fetchPublicCustomerProfiles } from '../src/services/customer-profiles.js';
import { fetchStations, fetchStationInfo } from '../src/services/api.js';
import { getCustomer, groupCustomers, customerPath } from '../src/utils/customers.js';

test('validates and deduplicates customer IDs', () => {
  assert.deepEqual(normalizeCustomerIds([42, '42', null, undefined, 0, '01', -1, 'x', '4294967296']), ['42']);
});
test('customer ID resolves current profile for every station and clears stale fields', () => {
  const profile = { id: 42, name: 'Current name', logo_url: 'https://example.com/logo.png', web_public: false };
  const stations = attachCustomerProfiles([
    { id: 1, customer_id: 42, customer: 'Old name', customer_web_public: 1 },
    { id: 2, customer_id: '42' },
    { id: 3, customer_id: null, customer: 'Deleted name' },
    { id: 4, customer_id: 43, customer: 'Unavailable name', customer_web_public: 1 },
  ], [profile]);
  assert.equal(getCustomer(stations[0]).name, 'Current name');
  assert.equal(getCustomer(stations[0]).webPublic, false);
  assert.equal(getCustomer(stations[0]).logoUrl, profile.logo_url);
  assert.equal(getCustomer(stations[2]), null);
  assert.equal(getCustomer(stations[3]), null);
  assert.equal(groupCustomers(stations)[0].id, 'id-42');
  assert.deepEqual(groupCustomers(stations)[0].stations.map(station => station.id), [1, 2]);
});
test('public fetch strips private fields and ignores unsolicited customer IDs', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /customer\.php\?public=true&ids=42$/);
    return { ok: true, json: async () => ({ customers: [{ id: 42, name: 'Current', email: 'private', password_hash: 'secret', token: 'secret', web_public: 0 }, { id: 43, name: 'Unrequested' }] }) };
  });
  assert.deepEqual(await fetchPublicCustomerProfiles([42, 42]), [{ id: 42, name: 'Current', web_public: 0 }]);
});
test('station list fetch batches repeated customer IDs and detail uses the same lookup', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(url);
    if (url.includes('customer.php')) return { ok: true, json: async () => ({ customers: [{ id: 42, name: 'Resolved', logo_url: 'https://example.com/logo.png' }] }) };
    return { ok: true, json: async () => ({ stazioni: [{ id: 1, customer_id: 42 }, { id: 2, customer_id: 42 }], anagrafica: { id: 1, customer_id: 42 } }) };
  });
  const stations = await fetchStations();
  assert.equal(requests.filter(url => url.includes('customer.php')).length, 1);
  assert.equal(getCustomer(stations[1]).name, 'Resolved');
  assert.equal(getCustomer(await fetchStationInfo(1)).logoUrl, 'https://example.com/logo.png');
});
test('profile outage preserves weather stations and never publishes stale names or consent', async t => {
  t.mock.method(globalThis, 'fetch', async url => url.includes('customer.php') ? { ok: false } : { ok: true, json: async () => ({ stazioni: [{ id: 1, nome: 'Station', customer_id: 42, customer: 'Stale', customer_web_public: 1 }] }) });
  const stations = await fetchStations();
  assert.equal(stations[0].nome, 'Station');
  assert.equal(getCustomer(stations[0]), null);
});
test('unassigned stations do not make a profile request', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => { requests.push(url); return { ok: true, json: async () => ({ stazioni: [{ id: 1, customer_id: null }] }) }; });
  await fetchStations();
  assert.equal(requests.length, 1);
});

test('project names remain distinct from customer names and survive public profile filtering', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ customers: [{ id: 42, name: 'Customer', project_name: 'Observatory', description: 'Project description', email: 'private@example.com' }] }) }));
  const profiles = await fetchPublicCustomerProfiles([42]);
  const customer = getCustomer(attachCustomerProfiles([{ id: 1, customer_id: 42 }], profiles)[0]);
  assert.equal(customer.name, 'Customer');
  assert.equal(customer.projectName, 'Observatory');
  assert.equal(customer.description, 'Project description');
  assert.equal(profiles[0].email, undefined);
});

test('station detail resolves its customer ID and builds the canonical public link', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url);
    if (url.includes('customer.php')) return { ok: true, json: async () => ({ customers: [{ id: 42, name: 'Name from customer API', logo_url: 'https://example.com/current.png' }] }) };
    return { ok: true, json: async () => ({ anagrafica: { id: 1, customer_id: 42, customer: 'Stale station name' } }) };
  });
  const customer = getCustomer(await fetchStationInfo(1));
  assert.equal(customer.name, 'Name from customer API');
  assert.equal(customer.logoUrl, 'https://example.com/current.png');
  assert.equal(customerPath(customer), '/customer/42');
  assert.ok(calls.some(url => url.includes('customer.php?public=true&ids=42')));
});
