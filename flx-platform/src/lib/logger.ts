import { getDb, AuditLog } from './db'; // Assuming AuditLog interface is in db.ts

export async function logAuditAction(
    action: string,
    adminEmail: string,
    details: {
        target?: string;
        metadata?: Record<string, any>;
        clientIP?: string | null;
        userAgent?: string | null;
    }
) {
    try {
        const db = await getDb();
        const auditCollection = db.collection<AuditLog>('AuditLogs');

        const logEntry: AuditLog = {
            action,
            admin: adminEmail,
            target: details.target,
            metadata: details.metadata,
            timestamp: new Date(),
            clientIP: details.clientIP || undefined,
            userAgent: details.userAgent || undefined,
        };

        await auditCollection.insertOne(logEntry);
        console.log(`Audit Log: ${action} by ${adminEmail}`, details.metadata || '');

    } catch (error) {
        console.error("Failed to write audit log:", error);
        // Decide if this failure is critical. Usually, it shouldn't block the main operation.
    }
}

// Helper to get request details in API routes
export function getRequestDetails(req: Request) {
    const clientIP = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    return { clientIP, userAgent };
}