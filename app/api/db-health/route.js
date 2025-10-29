export const runtime = 'nodejs'; // ensure Node runtime (Mongoose incompatible with Edge)

import { NextResponse } from 'next/server';
import { connectToDB, getMongooseConnection } from '@/lib/mongoose';

export async function GET() {
  try {
    const conn = await connectToDB();
    // use native admin ping through the underlying driver
    const admin = conn.connection.getClient().db().admin();
    const ping = await admin.ping();

    const state = getMongooseConnection().readyState; // 1 = connected
    return NextResponse.json({
      ok: true,
      mongooseReadyState: state,
      ping,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
