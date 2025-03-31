import { Chain } from './constants';

// Represents a transaction displayed in the history table
export interface Transaction {
  _id: string; // From MongoDB
  txHash: string;
  timestamp: string; // ISO Date string or formatted string
  adminWallet: string; // Sender (always admin)
  recipient?: string; // For mints
  targetWallet?: string; // For burns
  amount: number;
  chain: Chain;
  action: 'mint' | 'burn'; // Differentiate action type
  status: 'pending' | 'success' | 'failed'; // Status indication
  emailSent?: boolean; // For mints
  reason?: 'manual' | 'expired'; // For burns
  gasFee?: string; // Optional: fetched separately or stored
  explorerUrl: string;
}

// Interface for wallet connection state
export interface WalletConnection {
  address: string | null;
  provider: any | null; // ethers Provider or tronWeb instance
  chain: Chain | null;
  isWrongNetwork: boolean;
}

// Interface for form inputs (useful with react-hook-form)
export interface MintFormInputs {
    recipient: string;
    amount: string; // Keep as string for input handling
    recipientEmail?: string; // Optional email field
}

export interface BurnFormInputs {
    targetWallet: string;
    amount: string;
}

