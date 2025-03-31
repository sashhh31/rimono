export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, MintRecord, BurnRecord } from '@/lib/db';
import { Chain, EXPLORER_URLS } from '@/lib/constants';
import { Transaction } from '@/lib/types'; // Import the frontend Transaction type

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const chain = searchParams.get('chain') as Chain | null;
        const limitParam = searchParams.get('limit');
        const pageParam = searchParams.get('page');

        const limit = limitParam ? parseInt(limitParam, 10) : 50;
        const page = pageParam ? parseInt(pageParam, 10) : 1;
        const skip = (page - 1) * limit;

        if (!chain || !['BSC', 'TRON'].includes(chain)) {
             return NextResponse.json({ error: 'Missing or invalid chain parameter (BSC or TRON)' }, { status: 400 });
        }

        const db = await getDb();
        const mintCollection = db.collection<MintRecord>('MintRecords');
        const burnCollection = db.collection<BurnRecord>('BurnRecords');

        // Fetch mint and burn records separately for the given chain, sorted by timestamp descending
        const mints = await mintCollection.find({ chain })
            .sort({ timestamp: -1 })
            .skip(skip) // Apply pagination - adjust if combining results first
            .limit(limit)
            .toArray();

        const burns = await burnCollection.find({ chain })
            .sort({ timestamp: -1 })
            .skip(skip) // Apply pagination
            .limit(limit)
            .toArray();

        // Combine and format results into the Transaction type for the frontend
        const combined: Transaction[] = [
            ...mints.map((m): Transaction => ({
                _id: m._id!.toString(),
                txHash: m.txHash,
                timestamp: m.timestamp.toISOString(),
                adminWallet: m.adminWallet,
                recipient: m.recipient,
                targetWallet: undefined,
                amount: m.amount,
                chain: m.chain,
                action: 'mint',
                status: 'success', // TODO: Enhance status based on blockchain confirmation if possible
                emailSent: m.emailSent,
                reason: undefined,
                explorerUrl: `${EXPLORER_URLS[m.chain]}${m.txHash}`,
            })),
            ...burns.map((b): Transaction => ({
                _id: b._id!.toString(),
                txHash: b.txHash,
                timestamp: b.timestamp.toISOString(),
                adminWallet: b.adminWallet,
                recipient: undefined,
                targetWallet: b.targetWallet,
                amount: b.amount,
                chain: b.chain,
                action: 'burn',
                status: 'success', // TODO: Enhance status
                emailSent: undefined,
                reason: b.reason,
                explorerUrl: `${EXPLORER_URLS[b.chain]}${b.txHash}`,
            })),
        ];

        // Sort the combined results again by timestamp descending
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply limit after combining and sorting (alternative pagination strategy)
        const paginatedResults = combined.slice(0, limit); // If fetching more initially and slicing

        // TODO: Add total count for proper pagination on frontend if needed
        // const totalCount = await mintCollection.countDocuments({ chain }) + await burnCollection.countDocuments({ chain });

        return NextResponse.json({ transactions: paginatedResults /*, totalCount, page, limit */ });

    } catch (error: any) {
        console.error("Transactions API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}