import { NextResponse } from "next/server";
import clientPromise, { getDb } from "@/lib/db"; // Import clientPromise for ping
import { ethers } from "ethers";
import TronWeb from "tronweb";
import sgMail from "@sendgrid/mail";

// Configuration (ensure these are set in your environment)
const NEXT_PUBLIC_BSC_RPC_URL =
  process.env.NEXT_PUBLIC_BSC_RPC_URL || "bsc-testnet-rpc.publicnode.com";
const NEXT_PUBLIC_TRON_RPC_URL =
  process.env.NEXT_PUBLIC_TRON_RPC_URL || "https://api.trongrid.io";
const NEXT_PUBLIC_SENDGRID_API_KEY = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;

interface ComponentStatus {
  name: string;
  status: "ok" | "error" | "misconfigured";
  message?: string;
  details?: any;
}

async function checkDatabase(): Promise<ComponentStatus> {
  try {
    const client = await clientPromise;
    // The isConnected() method is often deprecated or unreliable. Ping is better.
    await client.db().admin().ping();
    return { name: "MongoDB Atlas", status: "ok" };
  } catch (error: any) {
    console.error("Health Check Error - MongoDB:", error);
    return { name: "MongoDB Atlas", status: "error", message: error.message };
  }
}

async function checkBscRpc(): Promise<ComponentStatus> {
  if (!NEXT_PUBLIC_BSC_RPC_URL)
    return {
      name: "BSC RPC",
      status: "misconfigured",
      message: "NEXT_PUBLIC_BSC_RPC_URL not set",
    };
  try {
    const provider = new ethers.JsonRpcProvider(NEXT_PUBLIC_BSC_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    if (typeof blockNumber !== "number" || blockNumber < 0) {
      throw new Error("Invalid block number received");
    }
    // Optional: Check block timestamp for freshness
    // const block = await provider.getBlock(blockNumber);
    // const ageSeconds = Date.now() / 1000 - block.timestamp;
    // if (ageSeconds > 300) throw new Error(`RPC might be lagging (block age: ${ageSeconds.toFixed(0)}s)`);

    return { name: "BSC RPC", status: "ok", details: { blockNumber } };
  } catch (error: any) {
    console.error("Health Check Error - BSC RPC:", error);
    return { name: "BSC RPC", status: "error", message: error.message };
  }
}

async function checkTronRpc(): Promise<ComponentStatus> {
  if (!NEXT_PUBLIC_TRON_RPC_URL)
    return {
      name: "TRON RPC (TronGrid)",
      status: "misconfigured",
      message: "NEXT_PUBLIC_TRON_RPC_URL not set",
    };
  try {
    // TronWeb instance specifically for health check
    const tronWeb = new TronWeb({
      fullHost: NEXT_PUBLIC_TRON_RPC_URL,
      // Add headers for API key if using TronGrid Pro
      headers: process.env.NEXT_PUBLIC_TRONGRID_API_KEY
        ? { "TRON-PRO-API-KEY": process.env.NEXT_PUBLIC_TRONGRID_API_KEY }
        : undefined,
    });
    // Use getCurrentBlock instead of directly calling wallet/getnowblock
    const block = await tronWeb.trx.getCurrentBlock();
    if (!block || !block.block_header?.raw_data?.number) {
      throw new Error(
        "Failed to fetch current Tron block or block format invalid"
      );
    }
    const blockNumber = block.block_header.raw_data.number;
    // Optional: Check block timestamp
    // const blockTimestamp = block.block_header.raw_data.timestamp;
    // const ageSeconds = (Date.now() - blockTimestamp) / 1000;
    // if (ageSeconds > 300) throw new Error(`Tron RPC might be lagging (block age: ${ageSeconds.toFixed(0)}s)`);

    return {
      name: "TRON RPC (TronGrid)",
      status: "ok",
      details: { blockNumber },
    };
  } catch (error: any) {
    console.error("Health Check Error - TRON RPC:", error);
    return {
      name: "TRON RPC (TronGrid)",
      status: "error",
      message: error.message,
    };
  }
}
async function checkSendGrid(): Promise<ComponentStatus> {
  if (!NEXT_PUBLIC_SENDGRID_API_KEY)
    return {
      name: "SendGrid",
      status: "misconfigured",
      message: "NEXT_PUBLIC_SENDGRID_API_KEY not set",
    };
  try {
    // SendGrid doesn't have a simple ping. We can try to fetch account details or verify key format.
    // This is a basic check assuming the key exists.
    // For a more robust check, you might try sending a test email to a monitoring address,
    // but that's more involved and could incur costs/rate limits.
    sgMail.setApiKey(NEXT_PUBLIC_SENDGRID_API_KEY); // Re-setting key here is safe if it hasn't changed
    // Attempt a read-only API call if one is available and suitable
    // Example: Fetch IP pools (requires specific permissions)
    // const [response, body] = await sgMail.client.request({ url: '/v3/ips/pools', method: 'GET' });
    // if (response.statusCode >= 400) throw new Error(`SendGrid API check failed: ${response.statusCode}`);

    // Simple check: Key is present
    return { name: "SendGrid", status: "ok", message: "API Key is configured" };
  } catch (error: any) {
    console.error("Health Check Error - SendGrid:", error);
    return {
      name: "SendGrid",
      status: "error",
      message: `Check failed: ${error.message}`,
    };
  }
}

export async function GET(request: Request) {
  // Optional: Secure this endpoint if needed (e.g., require a specific header or internal access)
  // const apiKey = request.headers.get('X-Admin-API-Key');
  // if (apiKey !== process.env.ADMIN_INTERNAL_API_KEY) {
  //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  const checks = await Promise.all([
    checkDatabase(),
    checkBscRpc(),
    checkTronRpc(),
    checkSendGrid(),
  ]);

  const overallStatus = checks.every((check) => check.status === "ok")
    ? "ok"
    : "error";
  const httpStatus = overallStatus === "ok" ? 200 : 503; // 503 Service Unavailable if any component fails

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: checks,
    },
    { status: httpStatus }
  );
}

// Important: Add edge runtime config if deploying to Vercel Edge Functions (if desired, but likely not needed for this)
// export const runtime = 'edge';
