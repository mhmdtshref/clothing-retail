/* eslint-disable no-console */
(async () => {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  try {
    const { default: mongoose } = await import('mongoose');
    const m = await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const ping = await m.connection.getClient().db().admin().ping();
    console.log('Mongo ping:', ping);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Mongo connection failed:', e.message);
    process.exit(2);
  }
})();
