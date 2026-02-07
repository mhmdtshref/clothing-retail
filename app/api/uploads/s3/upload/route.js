export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3, getBucket, publicUrlForKey } from '@/lib/aws/s3';

// Parse MAX_BYTES safely (avoid BigInt / invalid values in env)
const MAX_BYTES = (() => {
  const raw = process.env.S3_MAX_IMAGE_BYTES;
  if (!raw) return 200 * 1024; // default 200KB
  const normalized = String(raw).trim().replace(/_/g, '').replace(/n$/i, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
})();

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  const rounded = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${rounded} MB`;
}

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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const productId = form.get('productId') ? String(form.get('productId')) : '';
    const givenExt = form.get('ext') ? String(form.get('ext')) : '';
    const contentType = file.type || 'application/octet-stream';
    if (!String(contentType).toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Only image/* uploads allowed' }, { status: 400 });
    }

    // Prefer size check BEFORE reading the blob to avoid disturbing the body
    const fileSize = Number(file?.size ?? 0);
    if (fileSize > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `File too large (max ${formatBytes(MAX_BYTES)})` }),
        {
          status: 413,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = pickExt(contentType, givenExt || file.name?.split('.').pop() || '');
    const idPart = productId || crypto.randomUUID();
    const key = `products/${idPart}.${ext}`;
    const s3 = getS3();
    const Bucket = getBucket();
    await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buf, ContentType: contentType }));
    const publicUrl = publicUrlForKey(key);
    return NextResponse.json({ ok: true, key, publicUrl, contentType });
  } catch (e) {
    console.error('s3 upload error', e);
    return NextResponse.json(
      { error: e?.message || 'Upload failed', errjson: String(e) },
      { status: 500 },
    );
  }
}
