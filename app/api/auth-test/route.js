import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ authenticated: true, userId: session.user?.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
