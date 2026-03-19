import { redirect } from 'next/navigation';

// The Jobs module now lives in the root AppShell (state-based navigation).
// Redirect any direct /jobs URL access back to the root.
export default function JobsPage() {
  redirect('/');
}
