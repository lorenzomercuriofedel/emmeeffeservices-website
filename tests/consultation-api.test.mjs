import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/api/consultation/route.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
function setup(data = { request_sent: true }) {
  const calls = [];
  const POST = new Function('NextResponse', 'fetch', `${source}\nreturn POST;`)(
    { json: (body, options) => ({ body, ...options }) },
    async (...args) => { calls.push(args); return { ok: true, status: 200, json: async () => data }; }
  );
  return { POST, calls };
}
function request(body, origin = 'https://example.com') {
  return new Request('https://example.com/api/consultation', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
test('both business services send requests without forwarding credentials or exposing tokens', async () => {
  for (const service of ['data', 'land']) {
    const { POST, calls } = setup({ request_sent: true, token: 'private' });
    const response = await POST(request({ action: 'access_request', service }));
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { request_sent: true });
    assert.equal(calls[0][1].headers.Authorization, undefined);
  }
});
test('weather, account actions and cross-origin requests never reach the backend', async () => {
  const { POST, calls } = setup();
  for (const action of ['login', 'register', 'consultation', 'verify_email', 'station_visibility']) {
    assert.equal((await POST(request({ action, service: 'data' }))).status, 400);
  }
  assert.equal((await POST(request({ action: 'access_request', service: 'weather' }))).status, 422);
  assert.equal((await POST(request({ action: 'access_request', service: 'data' }, 'https://attacker.com'))).status, 403);
  assert.equal(calls.length, 0);
});
test('unexpected backend responses are rejected', async () => {
  const { POST } = setup({ token: 'private' });
  assert.equal((await POST(request({ action: 'access_request', service: 'data' }))).status, 502);
});
