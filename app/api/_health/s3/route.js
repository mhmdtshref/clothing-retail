export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getS3, getBucket, publicUrlForKey } from '@/lib/aws/s3';

export async function GET() {
  try {
    // initialize (validates env)
    getS3();
    const bucket = getBucket();
    const sample = publicUrlForKey('products/example.jpg');
    return NextResponse.json({ ok: true, bucket, sample });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
