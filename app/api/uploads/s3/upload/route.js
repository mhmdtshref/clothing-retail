export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3, getBucket, publicUrlForKey } from '@/lib/aws/s3';

const MAX_BYTES = Number(process.env.S3_MAX_IMAGE_BYTES || 5 * 1024 * 1024); // 5MB default

const EXT_FROM_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function pickExt(contentType, filenameExt) {
  if (filenameExt) return String(filenameExt).replace(/^\./, '').toLowerCase();
  return EXT_FROM_MIME[contentType] || 'jpg';
}

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    const productId = form.get('productId') ? String(form.get('productId')) : '';
    const givenExt = form.get('ext') ? String(form.get('ext')) : '';
    const contentType = file.type || 'application/octet-stream';
    if (!String(contentType).toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Only image/* uploads allowed' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` }, { status: 413 });
    }

    const ext = pickExt(contentType, givenExt || (file.name?.split('.').pop() || ''));
    const idPart = productId || crypto.randomUUID();
    const key = `products/${idPart}.${ext}`;

    const s3 = getS3();
    const Bucket = getBucket();
    await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buf, ContentType: contentType }));

    const publicUrl = publicUrlForKey(key);
    return NextResponse.json({ ok: true, key, publicUrl, contentType });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}


