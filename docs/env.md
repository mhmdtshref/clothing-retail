# Environment variables

## S3 uploads (images)

These routes require S3 configuration:

- `app/api/uploads/s3/upload/route.js`
- `app/api/uploads/s3/presign/route.js`
- `lib/aws/s3.js`

Required:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_BASE_URL`

Image size limit:

- `S3_MAX_IMAGE_BYTES`
  - Set to `40960` to enforce a strict **40KB** maximum.
  - This limit is enforced server-side; the client also compresses before upload.

## Amplify

If you deploy with `amplify.yml`, `.env` is generated from a single AWS Secrets Manager JSON secret.
Add the keys above (especially `S3_MAX_IMAGE_BYTES`) to that JSON payload.

## Authentication (Better Auth)This app uses Better Auth for authentication (email + password).

Required:

- `BETTER_AUTH_SECRET`
  - Must be at least 32 characters, high entropy.
  - You can generate one with `openssl rand -base64 32`.
- `BETTER_AUTH_URL`
  - Base URL of your app (dev example): `http://localhost:3000`
- `MONGODB_URI`
  - MongoDB connection string used by the app **and** Better Auth.
