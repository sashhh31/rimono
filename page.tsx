import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * This is the root page for the application (`/`).
 * In this setup, its primary role is handled by the layouts.
 * The `(main)` layout checks authentication and either renders the dashboard
 * or redirects to `/login`.
 *
 * This page component can show a loading state while that check happens,
 * although the user might be redirected very quickly.
 */
export default async function RootPage() {
  // Optional: You could re-check session here, but the layout already does.
  // If you check here and redirect, it might happen slightly faster than waiting
  // for the layout, but it adds redundancy.

  // const session = await getServerSession(authOptions);
  // if (!session) {
  //    redirect('/login');
  // } else {
  //    // Technically, the user is already authenticated,
  //    // so the (main)/layout will render the dashboard page.
  //    // We could redirect to a specific dashboard path if needed, but usually not necessary.
  //    // redirect('/dashboard'); // If your main page was nested further
  // }


  // Return a loading indicator as a placeholder while layouts/redirects occur.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Loading Application...</p>
        </div>
    </main>
  );

  // Alternatively, you could just return null if you don't want any loading indicator:
  // return null;
}