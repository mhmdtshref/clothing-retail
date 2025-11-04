export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAreas } from '@/lib/deliveries/optimus';

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const cityId = url.searchParams.get('cityId') || '';
    if (!cityId) return NextResponse.json({ error: 'ValidationError', message: 'cityId is required' }, { status: 400 });
    const { items } = await fetchAreas(cityId);
    const res = NextResponse.json({ ok: true, items });
    res.headers.set('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'UpstreamError', message: err?.message || String(err) }, { status: 502 });
  }
}


