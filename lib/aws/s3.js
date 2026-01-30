import { S3Client } from '@aws-sdk/client-s3';

let _s3 = null;

export function getS3() {
  if (_s3) return _s3;
  const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_REGION) throw new Error('Missing AWS_REGION');
  if (!AWS_ACCESS_KEY_ID) throw new Error('Missing AWS_ACCESS_KEY_ID');
  if (!AWS_SECRET_ACCESS_KEY) throw new Error('Missing AWS_SECRET_ACCESS_KEY');

  _s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  return _s3;
}

export function getBucket() {
  const { S3_BUCKET } = process.env;
  if (!S3_BUCKET) throw new Error('Missing S3_BUCKET');
  return S3_BUCKET;
}

export function publicUrlForKey(key) {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (!base) throw new Error('Missing S3_PUBLIC_BASE_URL');
  return `${base.replace(/\/$/, '')}/${String(key).replace(/^\//, '')}`;
}
