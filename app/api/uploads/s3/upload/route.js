export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3, getBucket, publicUrlForKey } from '@/lib/aws/s3';

// Parse MAX_BYTES safely (avoid BigInt / invalid values in env)
const MAX_BYTES = (() => {
  const raw = process.env.S3_MAX_IMAGE_BYTES;
  if (!raw) return 5 * 1024 * 1024; // default 5MB
  const normalized = String(raw).trim().replace(/_/g, '').replace(/n$/i, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
})();
const MAX_MB = Math.max(1, Math.round(MAX_BYTES / (1024 * 1024)));

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
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Perform auth AFTER accessing formData to avoid potential body locking
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const productId = form.get('productId') ? String(form.get('productId')) : '';
    const givenExt = form.get('ext') ? String(form.get('ext')) : '';
    const contentType = file.type || 'application/octet-stream';
    if (!String(contentType).toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Only image/* uploads allowed' }, { status: 400 });
    }

    // Prefer size check BEFORE reading the blob to avoid disturbing the body
    const fileSize = Number(file?.size ?? 0);
    if (fileSize > MAX_BYTES) {
      return new Response(JSON.stringify({ error: `File too large (max ${MAX_MB} MB)` }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      });
    }

    const buf = Buffer.from(await file.arrayBuffer());
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


