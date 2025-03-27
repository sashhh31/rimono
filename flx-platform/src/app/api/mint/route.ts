import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb, MintRecord } from '@/lib/db';
import { Chain, TOKEN_LIFESPAN_DAYS, EXPLORER_URLS } from '@/lib/constants';
import { sendMintNotificationEmail } from '@/lib/email';
import { logAuditAction, getRequestDetails } from '@/lib/logger';
import { calculateExpiryDate } from '@/lib/utils';
import * as z from 'zod';

const mintRequestSchema = z.object({
    recipient: z.string().trim().min(1, "Recipient address is required"),
    amount: z.number().positive("Amount must be positive"),
    chain: z.enum(['BSC', 'TRON']),
    txHash: z.string().trim().min(1, "Transaction hash is required"),
    recipientEmail: z.string().email("Invalid email format").nullable().optional(),
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


        const validation = mintRequestSchema.safeParse(reqBody);
        if (!validation.success) {
             // Log validation error details if needed
             console.error("Mint API Validation Error:", validation.error.errors);
            return NextResponse.json({ error: 'Invalid input', details: validation.error.errors }, { status: 400 });
        }

        const { recipient, amount, chain, txHash, recipientEmail } = validation.data;

        const db = await getDb();
        const mintCollection = db.collection<MintRecord>('MintRecords');

        // Check for duplicate txHash to prevent double recording
        const existingTx = await mintCollection.findOne({ txHash, chain });
        if (existingTx) {
            console.warn(`Duplicate mint transaction hash detected: ${txHash}`);
            // Still return success as the tx likely went through, just avoid double record/email
            return NextResponse.json({
                message: 'Transaction already recorded',
                txHash: existingTx.txHash,
                explorerUrl: `${EXPLORER_URLS[chain]}${existingTx.txHash}`
            }, { status: 200 });
        }

        const now = new Date();
        const expiryDate = calculateExpiryDate(TOKEN_LIFESPAN_DAYS);

        const newMintRecord: Omit<MintRecord, '_id'> = {
            txHash,
            adminWallet: session.user.email, // TODO: Link admin wallet address from DB if stored/needed
            recipient,
            amount,
            chain,
            timestamp: now,
            expiryDate,
            emailSent: false, // Default to false, update after trying to send
            emailAddress: recipientEmail || undefined, // Store email if provided
            // TODO: Add transaction status if available/needed from blockchain confirmation
            // status: 'success', // Assuming success if API is called after wallet confirmation
        };

        // Insert into DB
        const insertResult = await mintCollection.insertOne(newMintRecord as MintRecord); // Cast needed as _id is generated

        if (!insertResult.insertedId) {
            throw new Error("Failed to insert mint record into database.");
        }

        // Attempt to send email if address provided
        let emailSuccess = false;
        if (recipientEmail) {
            // Construct the full record for the email function
             const fullRecord: MintRecord = {
                 ...newMintRecord,
                 _id: insertResult.insertedId,
                 // Add any other required fields for email template
             };
            emailSuccess = await sendMintNotificationEmail(fullRecord, recipientEmail);

            // Update emailSent status in DB (fire and forget is okay, or await)
            mintCollection.updateOne({ _id: insertResult.insertedId }, { $set: { emailSent: emailSuccess } });
        }

         // Audit Log
        await logAuditAction('mint', adminEmail, {
            target: recipient,
            metadata: { amount, chain, txHash, emailSent: emailSuccess, recipientEmail: recipientEmail || 'N/A' },
            clientIP: reqDetails.clientIP,
            userAgent: reqDetails.userAgent
        });

        return NextResponse.json({
            message: 'Mint recorded successfully',
            txHash,
            explorerUrl: `${EXPLORER_URLS[chain]}${txHash}`,
            emailSentStatus: recipientEmail ? emailSuccess : 'not_requested'
        }, { status: 201 });

    } catch (error: any) {
        console.error("Mint API Error:", error);
         // Basic error logging for now
         const session = await getServerSession(authOptions); // Get session again for logging if possible
         await logAuditAction('mint_error', session?.user?.email || 'unknown', {
            metadata: { error: error.message },
            clientIP: getRequestDetails(request).clientIP,
         });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}