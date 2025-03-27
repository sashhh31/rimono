// This component implicitly uses the session from the root layout's provider
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import React from 'react';
// Import components like Sidebar, Header if you have them

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login'); // Redirect to login if not authenticated
  }

  // You can fetch user-specific data here if needed using session.user.id

  return (
    <div className="flex flex-col min-h-screen">
      {/* Optional: Add a Header component here */}
      {/* <Header user={session.user} /> */}
      <main className="flex-grow container mx-auto px-4 py-8">
          {children}
      </main>
      {/* Optional: Add a Footer component here */}
    </div>
  );
}