import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Ensure database setup runs before authentication can happen
import { setupDatabase } from '@/lib/db';
setupDatabase(); // Call DB setup here - might run multiple times in dev HMR, but index creation is idempotent

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };