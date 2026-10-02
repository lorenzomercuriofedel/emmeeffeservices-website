import { NextResponse } from 'next/server';
import { normalizeCustomerIds, fetchPublicCustomerProfiles } from '@/src/services/customer-profiles';

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('ids') ?? '';
  const ids = raw.split(',');
  const normalized = normalizeCustomerIds(ids);
  if (raw.length > 1100 || !normalized.length || ids.length > 100 || ids.some(id => !normalized.includes(id))) {
    return NextResponse.json({ error: 'Invalid customer IDs' }, { status: 400 });
  }
  try {
    const customers = await fetchPublicCustomerProfiles(normalized);
    return NextResponse.json({ customers }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return NextResponse.json({ error: 'Customer profiles unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
