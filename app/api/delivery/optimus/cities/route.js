export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { connectToDB } from '@/lib/mongoose';
import City from '@/models/city';

export async function GET() {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectToDB();
    const docs = await City.find({ provider: 'optimus' }, { providerCityId: 1, name: 1 })
      .sort({ name: 1 })
      .lean();
    const items = (docs || []).map((c) => ({ id: c.providerCityId, name: c.name || '' }));
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
