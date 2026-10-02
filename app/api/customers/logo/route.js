import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
  const token = (await cookies()).get('meteo_customer_session')?.value;
  if (!token) return reply({ error: 'Unauthorized' }, 401);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'Multipart required' }, 415);
  if (Number(request.headers.get('content-length')) > 2200000) return reply({ error: 'File too large' }, 413);
  try {
    const incoming = await request.formData();
    const file = incoming.get('logo');
    if (!file || typeof file === 'string' || file.size > 2097152 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reply({ error: 'Use PNG, JPEG or WebP up to 2 MB' }, 422);
    const body = new FormData();
    body.set('action', 'upload_logo'); body.set('logo', file, 'logo');
    const response = await fetch('https://meteopine.altervista.org/api/customer.php', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) return reply({ error: 'Logo upload failed' }, response.status);
    const data = await response.json();
    if (!data.customer?.id || typeof data.customer.logo_url !== 'string') return reply({ error: 'Invalid profile' }, 502);
    return reply({ customer: data.customer, stations: data.stations ?? [] });
  } catch { return reply({ error: 'Logo upload unavailable' }, 502); }
}
