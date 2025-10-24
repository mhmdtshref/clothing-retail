import { auth } from '@clerk/nextjs';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ authenticated: true, userId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}


