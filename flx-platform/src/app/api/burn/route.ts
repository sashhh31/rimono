import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, BurnRecord } from '@/lib/db';
import { Chain, EXPLORER_URLS } from '@/lib/constants';
import { logAuditAction, getRequestDetails } from '@/lib/logger';
import * as z from 'zod';

const burnRequestSchema = z.object({
    target: z.string().trim().min(1, "Target address is required"),
    amount: z.number().positive("Amount must be positive"),
    chain: z.enum(['BSC', 'TRON']),
    txHash: z.string().trim().min(1, "Transaction hash is required"),
});

export async function POST(request: Request) {
     try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
         const adminEmail = session.user.email;
         const reqDetails = getRequestDetails(request);

        let reqBody;
        try {
            reqBody = await request.json();
        } catch (e) {
             return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const validation = burnRequestSchema.safeParse(reqBody);
        if (!validation.success) {
             console.error("Burn API Validation Error:", validation.error.errors);
            return NextResponse.json({ error: 'Invalid input', details: validation.error.errors }, { status: 400 });
        }

        const { target, amount, chain, txHash } = validation.data;

        const db = await getDb();
        const burnCollection = db.collection<BurnRecord>('BurnRecords');

         // Check for duplicate txHash
        const existingTx = await burnCollection.findOne({ txHash, chain });
        if (existingTx) {
            console.warn(`Duplicate burn transaction hash detected: ${txHash}`);
            return NextResponse.json({
                message: 'Burn already recorded',
                txHash: existingTx.txHash,
                explorerUrl: `${EXPLORER_URLS[chain]}${existingTx.txHash}`
            }, { status: 200 });
        }


        const newBurnRecord: Omit<BurnRecord, '_id'> = {
            txHash,
            adminWallet: session.user.email, // TODO: Link admin wallet address
            targetWallet: target,
            amount,
            chain,
            timestamp: new Date(),
            reason: 'manual', // Manual burn via API
            // status: 'success' // Assume success
        };

        const insertResult = await burnCollection.insertOne(newBurnRecord as BurnRecord);

         if (!insertResult.insertedId) {
            throw new Error("Failed to insert burn record into database.");
        }

        // Audit Log
         await logAuditAction('burn', adminEmail, {
            target: target,
            metadata: { amount, chain, txHash },
             clientIP: reqDetails.clientIP,
            userAgent: reqDetails.userAgent
        });


        return NextResponse.json({
            message: 'Burn recorded successfully',
            txHash,
            explorerUrl: `${EXPLORER_URLS[chain]}${txHash}`
        }, { status: 201 });

     } catch (error: any) {
        console.error("Burn API Error:", error);
         const session = await getServerSession(authOptions);
          await logAuditAction('burn_error', session?.user?.email || 'unknown', {
            metadata: { error: error.message },
            clientIP: getRequestDetails(request).clientIP,
         });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}