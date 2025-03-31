export type Chain = 'BSC' | 'TRON';

export const BSC_CHAIN_ID = 97; // BSC Mainnet Chain ID (or 97 for Testnet)
export const TRON_CHAIN_ID_MAINNET = 'TRON_MAINNET'; // Use custom identifier for Tron
export const TRON_CHAIN_ID_SHASTA = 'TRON_SHASTA'; // Use custom identifier for Tron Testnet

// Determine TRON Chain ID based on environment or configuration if needed
export const ACTIVE_TRON_CHAIN_ID = TRON_CHAIN_ID_MAINNET; // Or TRON_CHAIN_ID_SHASTA

export const TOKEN_LIFESPAN_DAYS = 180;

// Explorer URLs
export const EXPLORER_URLS: Record<Chain, string> = {
  BSC: 'https://testnet.bscscan.com/tx/', // Adjust for testnet if needed
  TRON: 'https://shasta.tronscan.org/#/transaction/' // Adjust for Shasta if needed
};

// Add other constants like contract addresses if not solely relying on .env
// export const BEP20_ADDRESS = process.env.NEXT_PUBLIC_NEXT_PUBLIC_BEP20_CONTRACT_ADDRESS || "0x...";
// export const TRC20_ADDRESS = process.env.NEXT_PUBLIC_NEXT_PUBLIC_TRC20_CONTRACT_ADDRESS || "T...";