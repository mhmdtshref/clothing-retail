export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import crypto from 'node:crypto';
import { getS3, getBucket, publicUrlForKey } from '@/lib/aws/s3';

const MAX_BYTES = Number(process.env.S3_MAX_IMAGE_BYTES || 40960); // 40KB default

const EXT_FROM_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function pickExt(contentType, explicitExt) {
  if (explicitExt) return explicitExt.replace(/^\./, '').toLowerCase();
  return EXT_FROM_MIME[contentType] || 'jpg';
}

export async function POST(req) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const contentType = String(body?.contentType || '').toLowerCase().trim();
  if (!contentType || !contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'contentType must be image/*' }, { status: 400 });
  }

  const productId = body?.productId ? String(body.productId) : '';
  const ext = pickExt(contentType, body?.ext);
  const idPart = productId || crypto.randomUUID();
  const key = `products/${idPart}.${ext}`;

  try {
    const s3 = getS3();
    const Bucket = getBucket();

    const { url, fields } = await createPresignedPost(s3, {
      Bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, MAX_BYTES],
        ['starts-with', '$Content-Type', 'image/'],
        ['eq', '$key', key],
      ],
      Fields: {
        'Content-Type': contentType,
        key,
      },
      Expires: 60,
    });

    const publicUrl = publicUrlForKey(key);
    return NextResponse.json({
      ok: true,
      key,
      url,
      fields,
      publicUrl,
      maxBytes: MAX_BYTES,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to create presigned post' }, { status: 500 });
  }
}


