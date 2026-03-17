'use client';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import MainDashboard from '@/components/MainDashboard';

export default function Page() {
  return (
    <>
      <SignedIn>
        <MainDashboard />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
