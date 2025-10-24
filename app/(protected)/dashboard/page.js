import { auth } from '@clerk/nextjs/server';

export default async function Dashboard() {
  await auth.protect();

  return (
    <main style={{ padding: 24 }}>
      <section style={{
        marginTop: 16, padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12
      }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ marginTop: 8 }}>You are signed in.</p>
      </section>
    </main>
  );
}


