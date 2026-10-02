import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { put, del } from '@vercel/blob';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
const ENDPOINT = 'https://meteopine.altervista.org/api/customer.php';
function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
  const token = (await cookies()).get('meteo_customer_session')?.value;
  if (!token) return reply({ error: 'Unauthorized' }, 401);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'Multipart required' }, 415);
  if (Number(request.headers.get('content-length')) > 2200000) return reply({ error: 'File too large' }, 413);
  let uploaded;
  try {
    const options = { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) };
    const account = await fetch(ENDPOINT, options);
    if (!account.ok) return reply({ error: 'Unauthorized' }, account.status);
    const profile = await account.json();
    if (!profile.customer?.id || !profile.stations?.length) return reply({ error: 'Assigned station required' }, 403);
    if (!process.env.BLOB_READ_WRITE_TOKEN) return reply({ error: 'Logo storage unavailable' }, 503);
    const incoming = await request.formData();
    const file = incoming.get('logo');
    if (!file || typeof file === 'string' || !file.size || file.size > 2097152 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reply({ error: 'Use PNG, JPEG or WebP up to 2 MB' }, 422);
    let image;
    try {
      const decoder = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 4194304, animated: false });
      const metadata = await decoder.metadata();
      if (!['png', 'jpeg', 'webp'].includes(metadata.format) || metadata.width > 2048 || metadata.height > 2048 || (metadata.pages ?? 1) > 1) return reply({ error: 'Invalid image dimensions or format' }, 422);
      image = await decoder.rotate().png().toBuffer();
    } catch { return reply({ error: 'Invalid image' }, 422); }
    uploaded = await put(`customer-logos/${profile.customer.id}/${randomUUID()}.png`, image, { access: 'public', contentType: 'image/png', addRandomSuffix: false });
    const response = await fetch(ENDPOINT, { ...options, method: 'PATCH', headers: { ...options.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ logo_url: uploaded.url }) });
    if (!response.ok) { await del(uploaded.url); uploaded = null; return reply({ error: 'Logo update failed' }, response.status); }
    const data = await response.json();
    const old = profile.customer.logo_url;
    if (old && new URL(old).hostname === new URL(uploaded.url).hostname && new URL(old).pathname.startsWith(`/customer-logos/${profile.customer.id}/`)) {
      try { await del(old); } catch { /* Profile already saved; old file can be removed later. */ }
    }
    uploaded = null;
    return reply({ customer: data.customer, stations: data.stations ?? [] });
  } catch {
    if (uploaded) { try { await del(uploaded.url); } catch {} }
    return reply({ error: 'Logo upload unavailable' }, 502);
  }
}
