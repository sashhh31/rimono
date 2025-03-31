import sgMail from '@sendgrid/mail';
import { MintRecord } from './db'; // Import your type

sgMail.setApiKey(process.env.NEXT_PUBLIC_SENDGRID_API_KEY!);
const fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL!;

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text version
}

async function sendEmail({ to, subject, html, text }: EmailParams): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SENDGRID_API_KEY || !fromEmail) {
    console.error("SendGrid API Key or From Email not configured. Skipping email.");
    return false;
  }

  const msg = {
    to,
    from: fromEmail, // Use the verified sender email
    subject,
    text: text || html.replace(/<[^>]*>?/gm, ''), // Basic text version
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error.response?.body || error.message);
    // Implement retry logic here if needed (using a queue, etc.)
    return false;
  }
}

// --- Specific Email Functions ---

export async function sendMintNotificationEmail(mintRecord: MintRecord, recipientEmail: string): Promise<boolean> {
  const expiryDateString = mintRecord.expiryDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const explorerBaseUrl = mintRecord.chain === 'BSC' ? 'https://bscscan.com/tx/' : 'https://tronscan.org/#/transaction/';
  const explorerLink = `${explorerBaseUrl}${mintRecord.txHash}`;

  const subject = `You've Received ${mintRecord.amount} Tokens!`;
  // Basic HTML template - Use SendGrid dynamic templates for better management
  const html = `
    <p>Hello,</p>
    <p>You have received <strong>${mintRecord.amount} ${mintRecord.chain} Tokens</strong>.</p>
    <p>These tokens will automatically expire on: <strong>${expiryDateString}</strong>.</p>
    <p>You can view the transaction details on the blockchain explorer:</p>
    <p><a href="${explorerLink}" target="_blank" rel="noopener noreferrer">View Transaction</a></p>
    <br/>
    <p>Regards,</p>
    <p>Rimon</p>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
}

// Add functions for other notifications if needed (e.g., burn confirmation, expiry warning)