import { MongoClient, Db, Collection, IndexDescription } from 'mongodb';
import bcrypt from 'bcrypt';

if (!process.env.NEXT_PUBLIC_MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "NEXT_PUBLIC_MONGODB_URI"');
}
if (!process.env.NEXT_PUBLIC_DB_NAME) {
    throw new Error('Invalid/Missing environment variable: "NEXT_PUBLIC_DB_NAME"');
}

const uri = process.env.NEXT_PUBLIC_MONGODB_URI;
const dbName = process.env.NEXT_PUBLIC_DB_NAME;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Define interfaces for schemas (align with PRD)
export interface AdminUser {
  _id?: object;
  email: string;
  passwordHash: string;
  walletAddresses?: { chain: string; address: string; isActive: boolean }[];
  lastLogin?: Date;
}

export interface MintRecord {
  _id?: object;
  txHash: string;
  adminWallet: string;
  recipient: string;
  amount: number;
  chain: 'BSC' | 'TRON';
  timestamp: Date;
  expiryDate: Date; // Important for auto-burn logic trigger
  emailSent: boolean;
  emailAddress?: string; // Store recipient email if provided/needed
}

export interface BurnRecord {
    _id?: object;
    txHash: string;
    adminWallet: string;
    targetWallet: string;
    amount: number;
    chain: 'BSC' | 'TRON';
    timestamp: Date;
    reason: 'manual' | 'expired';
}

export interface AuditLog {
    _id?: object;
    action: string;
    admin: string; // email
    target?: string; // wallet address or identifier
    metadata?: Record<string, any>;
    timestamp: Date;
    clientIP?: string;
    userAgent?: string;
}


// Function to ensure indexes and potentially create initial admin user
export async function setupDatabase() {
  try {
    const db = await getDb();
    console.log("Connected to MongoDB.");

    // Define Indexes
    const mintIndexes: IndexDescription[] = [
      { key: { txHash: 1 }, unique: true },
      { key: { recipient: 1 } },
      // TTL index for potential auto-cleanup (requires separate process)
      { key: { expiryDate: 1 }, expireAfterSeconds: 0 },
      { key: { timestamp: -1 } } // For sorting history
    ];
    const burnIndexes: IndexDescription[] = [
      { key: { txHash: 1 }, unique: true },
      { key: { timestamp: -1 } }
    ];
    const auditIndexes: IndexDescription[] = [
       { key: { timestamp: -1 } }
    ];

    await db.collection<MintRecord>('MintRecords').createIndexes(mintIndexes);
    await db.collection<BurnRecord>('BurnRecords').createIndexes(burnIndexes);
    await db.collection<AuditLog>('AuditLogs').createIndexes(auditIndexes);
    await db.collection<AdminUser>('AdminUser').createIndex({ email: 1 }, { unique: true });

    console.log("Database indexes ensured.");

    // Initial Admin User Setup (simple example)
    const adminCollection = db.collection<AdminUser>('AdminUser');
    const adminExists = await adminCollection.findOne({ email: process.env.NEXT_PUBLIC_ADMIN_EMAIL });

    if (!adminExists && process.env.NEXT_PUBLIC_ADMIN_EMAIL && process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      console.log("Creating initial admin user...");
      const saltRounds = parseInt(process.env.NEXT_PUBLIC_BCRYPT_SALT_ROUNDS || '12', 10);
      const passwordHash = await bcrypt.hash(process.env.NEXT_PUBLIC_ADMIN_PASSWORD, saltRounds);
      await adminCollection.insertOne({
        email: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        passwordHash: passwordHash,
        lastLogin: new Date() // Set initial login time
      });
      console.log(`Admin user ${process.env.NEXT_PUBLIC_ADMIN_EMAIL} created.`);
    } else if (adminExists) {
        console.log(`Admin user ${process.env.NEXT_PUBLIC_ADMIN_EMAIL} already exists.`);
    } else {
        console.warn("Skipping initial admin user creation (NEXT_PUBLIC_ADMIN_EMAIL or NEXT_PUBLIC_ADMIN_PASSWORD not set in .env.local)");
    }

  } catch (error) {
    console.error("Error setting up database:", error);
    // Decide if the application should exit if DB setup fails critically
    // process.exit(1);
  }
}

// Call setup function once, e.g., in a global setup file or layout server component
// Be mindful of where and how often this runs. Ideally only once on startup.
// A simple way is to call it in the root layout's server component, but ensure it handles concurrency.
// Or create a dedicated initialization script. For now, we'll assume it's called appropriately.
// setupDatabase(); // <-- Call this strategically

export default clientPromise; // Export promise for NextAuth adapter potentially