import { NextResponse } from 'next/server';

const ENDPOINT = 'https://meteopine.altervista.org/api/customer.php';
function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
async function handle(request) {
  const mutation = true;
  if (mutation && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
  let body;
  if (mutation) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415);
    if (Number(request.headers.get('content-length')) > 32768) return reply({ error: 'Payload too large' }, 413);
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 32768) return reply({ error: 'Payload too large' }, 413);
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid JSON object' }, 400);
    } catch { return reply({ error: 'Invalid JSON' }, 400); }
  }
  if (body.action !== 'access_request') return reply({ error: 'Invalid action' }, 400);
  if (!['data', 'land'].includes(body.service)) return reply({ error: 'Invalid service' }, 422);
  try {
    const upstream = await fetch(ENDPOINT, {
      method: request.method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json', ...(mutation ? { 'Content-Type': 'application/json' } : {}) },
      ...(mutation ? { body: JSON.stringify(body) } : {}),
    });
    const data = upstream.status === 204 ? {} : await upstream.json();
    if (!upstream.ok) return reply({ error: 'Consultation request failed' }, upstream.status);
    if (data.request_sent !== true) return reply({ error: 'Invalid request response' }, 502);
    return reply({ request_sent: true });
  } catch { return reply({ error: 'Consultation API unavailable' }, 502); }
}
export const POST = handle;
