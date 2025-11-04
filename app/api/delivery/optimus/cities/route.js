export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchCities } from '@/lib/deliveries/optimus';

export async function GET() {
  console.log('fetching cities');
  const { userId } = await auth();
  console.log('userId:', userId);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  console.log('userId:', userId);
  try {
    console.log('fetching cities');
    const { items } = await fetchCities();
    console.log('items:', items);
    const res = NextResponse.json({ ok: true, items });
    res.headers.set('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'UpstreamError', message: err?.message || String(err) }, { status: 502 });
  }
}


