import Header from '@/components/Header';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const { userId } = auth();
  if (!userId) redirect('/sign-in?redirect_url=/dashboard');

  return (
    <main style={{ padding: 24 }}>
      <Header />
      <section style={{
        marginTop: 16, padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12
      }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ marginTop: 8 }}>You are signed in as <code>{userId}</code>.</p>
      </section>
    </main>
  );
}


