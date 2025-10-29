'use client';
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: 24 }}>
      <SignIn appearance={{ elements: { formButtonPrimary: 'bg-black' } }} />
    </main>
  );
}
