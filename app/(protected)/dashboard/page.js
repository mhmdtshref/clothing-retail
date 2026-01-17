import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/dashboard');

  return (
    <main style={{ padding: 24 }}>
      <section
        style={{
          marginTop: 16,
          padding: 16,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ marginTop: 8 }}>You are signed in.</p>
      </section>
    </main>
  );
}
