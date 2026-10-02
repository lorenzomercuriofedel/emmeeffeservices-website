import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/api/customers/route.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
function setup({ token, upstream } = {}) {
  const calls = [];
  const NextResponse = { json(body, options) { return { body, ...options, cookies: { entries: [], set(...args) { this.entries.push(args); } } }; } };
  const fetch = async (...args) => { calls.push(args); return upstream ?? { ok: true, status: 200, json: async () => ({ customer: { id: 42 }, stations: [] }) }; };
  const routes = new Function('NextResponse', 'cookies', 'fetch', `${source}\nreturn {GET, POST, PATCH, DELETE};`)(NextResponse, async () => ({ get: () => token ? { value: token } : undefined }), fetch);
  return { routes, calls };
}
function request(method, body, origin = 'https://example.com') {
  return new Request('https://example.com/api/customers', { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('unauthenticated requests never call the customer backend', async () => {
  const { routes, calls } = setup();
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await routes[method](request(method, method === 'GET' ? null : {}))).status, 401);
  assert.equal(calls.length, 0);
});
test('cross-origin mutations are rejected before forwarding credentials', async () => {
  const { routes, calls } = setup({ token: 'secret' });
  assert.equal((await routes.PATCH(request('PATCH', { name: 'Other' }, 'https://attacker.com'))).status, 403);
  assert.equal(calls.length, 0);
});
test('login keeps the backend token exclusively in an HttpOnly cookie', async () => {
  const token = 'a'.repeat(64);
  const { routes, calls } = setup({ upstream: { ok: true, status: 200, json: async () => ({ token, customer: { id: 42 }, stations: [] }) } });
  const response = await routes.POST(request('POST', { action: 'login', email: 'test@example.com', password: 'test' }));
  assert.equal(response.status, 200);
  assert.equal(response.body.token, undefined);
  assert.equal(response.cookies.entries[0][1], token);
  assert.equal(response.cookies.entries[0][2].httpOnly, true);
  assert.equal(calls[0][1].headers.Authorization, undefined);
});
test('authenticated operations use bearer tokens and no cache', async () => {
  const { routes, calls } = setup({ token: 'a'.repeat(64) });
  await routes.GET(request('GET'));
  assert.equal(calls[0][1].headers.Authorization, `Bearer ${'a'.repeat(64)}`);
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].redirect, 'error');
});
test('logout, deletion and expired sessions clear the browser cookie', async () => {
  for (const [method, body] of [['POST', { action: 'logout' }], ['DELETE', { password: 'test' }]]) {
    const { routes } = setup({ token: 'a'.repeat(64), upstream: { ok: true, status: 204 } });
    assert.equal((await routes[method](request(method, body))).cookies.entries[0][2].maxAge, 0);
  }
  const { routes } = setup({ token: 'a'.repeat(64), upstream: { ok: false, status: 401, json: async () => ({ error: 'Expired' }) } });
  assert.equal((await routes.GET(request('GET'))).cookies.entries[0][2].maxAge, 0);
});
