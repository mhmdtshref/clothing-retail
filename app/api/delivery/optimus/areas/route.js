export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { connectToDB } from '@/lib/mongoose';
import Area from '@/models/area';

export async function GET(req) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const cityIdParam = url.searchParams.get('cityId') || '';
    if (!cityIdParam)
      return NextResponse.json(
        { error: 'ValidationError', message: 'cityId is required' },
        { status: 400 },
      );
    const cityId = Number(cityIdParam);
    if (!Number.isFinite(cityId)) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'cityId must be a number' },
        { status: 400 },
      );
    }
    await connectToDB();
    const docs = await Area.find(
      { provider: 'optimus', providerCityId: cityId },
      { providerAreaId: 1, name: 1 },
    )
      .sort({ name: 1 })
      .lean();
    const items = (docs || []).map((a) => ({ id: a.providerAreaId, name: a.name || '' }));
    const res = NextResponse.json({ ok: true, items });
    res.headers.set('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: 'UpstreamError', message: err?.message || String(err) },
      { status: 502 },
    );
  }
}
