import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/api/customers/logo/route.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export async', 'async');
function setup(token) {
  const calls = [];
  const route = new Function('NextResponse', 'cookies', 'fetch', `${source}\nreturn POST;`)(
    { json: (body, options) => ({ body, ...options }) }, async () => ({ get: () => token ? { value: token } : undefined }),
    async (...args) => { calls.push(args); return { ok: true, json: async () => ({ customer: { id: 42, logo_url: 'https://example.com/logo.png' }, stations: [] }) }; });
  return { route, calls };
}
function request(type = 'image/png', size = 10, origin = 'https://example.com') {
  const body = new FormData(); body.set('logo', new File([new Uint8Array(size)], 'logo.png', { type }));
  return new Request('https://example.com/api/customers/logo', { method: 'POST', headers: { origin }, body });
}
test('logo uploads require a session and same-origin requests', async () => {
  const anonymous = setup(); assert.equal((await anonymous.route(request())).status, 401); assert.equal(anonymous.calls.length, 0);
  const authorized = setup('secret'); assert.equal((await authorized.route(request('image/png', 10, 'https://attacker.com'))).status, 403); assert.equal(authorized.calls.length, 0);
});
test('oversized files and unsupported formats never reach the PHP backend', async () => {
  const { route, calls } = setup('secret');
  assert.equal((await route(request('image/svg+xml'))).status, 422);
  assert.equal((await route(request('image/png', 2097153))).status, 422);
  assert.equal(calls.length, 0);
});
test('accepted images are forwarded with the authenticated session and upload action', async () => {
  const { route, calls } = setup('secret');
  const response = await route(request());
  assert.equal(response.status, 200);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer secret');
  assert.equal(calls[0][1].body.get('action'), 'upload_logo');
  assert.equal(calls[0][1].body.get('logo').size, 10);
});
