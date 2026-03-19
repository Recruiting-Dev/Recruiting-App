'use client';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import AppShell from '@/components/AppShell';

export default function Page() {
  return (
    <>
      <SignedIn>
        <AppShell />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
