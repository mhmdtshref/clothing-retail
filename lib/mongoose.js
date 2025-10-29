import mongoose from 'mongoose';

const {
  MONGODB_URI,
  MONGODB_MAX_POOL_SIZE,
  MONGODB_MIN_POOL_SIZE,
  MONGODB_SERVER_SELECTION_TIMEOUT_MS,
} = process.env;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment.');
}

// In dev, use a global cached connection to survive HMR
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectToDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // Optional: make Mongoose queries strict by default
    mongoose.set('strictQuery', true);

    const opts = {
      maxPoolSize: Number(MONGODB_MAX_POOL_SIZE ?? 10),
      minPoolSize: Number(MONGODB_MIN_POOL_SIZE ?? 0),
      serverSelectionTimeoutMS: Number(MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function getMongooseConnection() {
  return mongoose.connection;
}
