import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ENDPOINT = 'https://meteopine.altervista.org/api/customers.php';
const COOKIE = 'meteo_customer_session';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/customers' };
function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
async function handle(request) {
  const mutation = request.method !== 'GET';
  if (mutation && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
  const jar = await cookies();
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
  const login = request.method === 'POST' && body?.action === 'login';
  const logout = request.method === 'POST' && body?.action === 'logout';
  if (request.method === 'POST' && !login && !logout) return reply({ error: 'Invalid action' }, 400);
  const token = jar.get(COOKIE)?.value;
  if (!login && !token) return reply({ error: 'Unauthorized' }, 401);
  try {
    const upstream = await fetch(ENDPOINT, {
      method: request.method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json', ...(mutation ? { 'Content-Type': 'application/json' } : {}), ...(token && !login ? { Authorization: `Bearer ${token}` } : {}) },
      ...(mutation ? { body: JSON.stringify(body) } : {}),
    });
    const data = upstream.status === 204 ? {} : await upstream.json();
    if (!upstream.ok) {
      const response = reply({ error: 'Customer API request failed' }, upstream.status);
      if (upstream.status === 401) response.cookies.set(COOKIE, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (login && (typeof data.token !== 'string' || !/^[A-Za-z0-9._~-]{32,4096}$/.test(data.token))) return reply({ error: 'Invalid session response' }, 502);
    if ((login || request.method === 'GET' || request.method === 'PATCH') && !data.customer?.id) return reply({ error: 'Invalid profile response' }, 502);
    const response = reply({ customer: data.customer ?? null, stations: Array.isArray(data.stations) ? data.stations : [] });
    if (login) response.cookies.set(COOKIE, data.token, { ...cookieOptions, maxAge: 28800 });
    if (logout || request.method === 'DELETE') response.cookies.set(COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch { return reply({ error: 'Customer API unavailable' }, 502); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
