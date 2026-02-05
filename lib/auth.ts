import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { username } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { MongoClient } from 'mongodb';
import { getSignupEnabled } from '@/lib/env';

declare global {
  var _betterAuthMongoClient: MongoClient | undefined;
}

const { MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL } = process.env;

if (!BETTER_AUTH_SECRET) {
  throw new Error('Missing BETTER_AUTH_SECRET in environment.');
}
if (!BETTER_AUTH_URL) {
  throw new Error('Missing BETTER_AUTH_URL in environment.');
}
if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment.');
}

const signupEnabled = getSignupEnabled();

const client = global._betterAuthMongoClient ?? new MongoClient(MONGODB_URI);
if (!global._betterAuthMongoClient) {
  global._betterAuthMongoClient = client;
}

export const auth = betterAuth({
  // Note: passing `client` enables database transactions. Standalone MongoDB doesn't support
  // transactions (requires replica set or mongos), so we omit it.
  database: mongodbAdapter(client.db()),
  emailAndPassword: { enabled: true, disableSignUp: !signupEnabled },
  experimental: { joins: true },
  // Make sure this is the last plugin in the array.
  plugins: [username(), nextCookies()],
});
