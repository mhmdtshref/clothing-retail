'use client';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Header() {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff'
    }}>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link href="/">Home</Link>
        <SignedIn>
          <Link href="/dashboard">Dashboard</Link>
        </SignedIn>
      </nav>
      <div>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <Link href="/sign-in">Sign in</Link>
        </SignedOut>
      </div>
    </header>
  );
}


