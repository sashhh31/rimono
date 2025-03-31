import { AuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb, AdminUser as DbAdminUser } from './db'; // Use DbAdminUser to avoid name clash
import bcrypt from 'bcrypt';

// Extend NextAuth User type if needed
interface CustomUser extends User {
    id: string;
    // Add other custom properties if necessary
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = await getDb();
        const adminCollection = db.collection<DbAdminUser>('AdminUser');

        // Find the single admin user
        const adminUser = await adminCollection.findOne({ email: credentials.email });

        if (!adminUser || !adminUser.passwordHash) {
          console.error('Admin user not found or password not set for:', credentials.email);
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, adminUser.passwordHash);

        if (!isValidPassword) {
          console.warn('Invalid password attempt for:', credentials.email);
          return null;
        }

        // Update last login timestamp (optional)
        await adminCollection.updateOne(
            { _id: adminUser._id },
            { $set: { lastLogin: new Date() } }
        );

        // Return user object for NextAuth session
        // Ensure the returned object structure matches NextAuth expectations
        return {
          id: adminUser._id!.toString(), // Use ObjectId as string ID
          email: adminUser.email,
          // Add other properties needed in the session/token
        } as CustomUser; // Cast to your extended user type
      },
    }),
  ],
  session: {
    strategy: 'jwt', // Use JWT for session management
    maxAge: 24 * 60 * 60, // 24 hours, align with PRD
  },
  jwt: {
    secret: process.env.NEXT_PUBLIC_NEXTAUTH_SECRET,
    // Consider using RS256 with public/private keys for production for better security
    // async encode({ secret, token, maxAge }) { /* ... */ },
    // async decode({ secret, token }) { /* ... */ },
  },
  pages: {
    signIn: '/login', // Redirect to custom login page
    // error: '/auth/error', // Optional: custom error page
  },
  callbacks: {
    // Use JWT callback to persist user ID in the token
    async jwt({ token, user }) {
        if (user) {
            token.id = user.id; // Add user id from authorize to the token
        }
        return token;
    },
    // Use session callback to add user ID to the session object client-side
    async session({ session, token }) {
        if (token && session.user) {
            // Add custom properties to session.user
            (session.user as CustomUser).id = token.id as string;
        }
        return session;
    },
  },
  secret: process.env.NEXT_PUBLIC_NEXTAUTH_SECRET, // Also needed at the top level
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
};