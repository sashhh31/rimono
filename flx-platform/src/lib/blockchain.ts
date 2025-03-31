// lib/blockchain.ts

import { ethers, BrowserProvider, Contract, Signer, parseEther, formatEther, JsonRpcProvider, Provider, JsonRpcSigner } from 'ethers';
import TronWeb from 'tronweb' ; // Still import, even if using custom types/any
import BEP20_ABI from '@/contracts/BEP20Token.json';
import TRC20_ABI from '@/contracts/TRC20Token.json';
import { Chain, BSC_CHAIN_ID, ACTIVE_TRON_CHAIN_ID } from './constants';
import { any } from 'zod';

// --- Basic Type Definitions for Tron (Placeholders if @types/tronweb is missing/incomplete) ---
// You can enhance these based on TronWeb documentation for properties you use
interface TronWebAddress {
    base58: string;
    hex: string;
}

interface TronWebInstance {
    defaultAddress: TronWebAddress;
    trx: {
        getCurrentBlock: () => Promise<any>; // Adjust 'any' if you know the block structure needed
        // Add other trx methods used, e.g., getBalance, sendTransaction
    };
    contract: (abi: any[], contractAddressHex: string) => Promise<any>; // Returns contract instance
    fullNode: { host: string }; // Used for network check
    // Add other TronWeb properties used
}

interface TronLinkProvider {
    ready: boolean; // Is TronLink unlocked and ready?
    request: (args: { method: string; params?: any }) => Promise<any>; // JSON-RPC request
    tronWeb?: TronWebInstance; // Injected tronWeb instance
}
// --- End Type Definitions ---


// --- Configuration & Validation ---
const NEXT_PUBLIC_BSC_RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC_URL||"bsc-testnet-rpc.publicnode.com";
const BEP20_ADDRESS:any = process.env.NEXT_PUBLIC_BEP20_CONTRACT_ADDRESS;
const NEXT_PUBLIC_TRON_RPC_URL = process.env.NEXT_PUBLIC_TRON_RPC_URL;
const TRC20_ADDRESS_BASE58 = process.env.NEXT_PUBLIC_TRC20_CONTRACT_ADDRESS;
const NEXT_PUBLIC_TRONGRID_API_KEY = process.env.NEXT_PUBLIC_TRONGRID_API_KEY; // Optional but recommended

if (!NEXT_PUBLIC_BSC_RPC_URL) throw new Error("Missing environment variable: NEXT_PUBLIC_BSC_RPC_URL");
if (!BEP20_ADDRESS) throw new Error("Missing environment variable: NEXT_PUBLIC_BEP20_CONTRACT_ADDRESS");
if (!NEXT_PUBLIC_TRON_RPC_URL) throw new Error("Missing environment variable: NEXT_PUBLIC_TRON_RPC_URL");
if (!TRC20_ADDRESS_BASE58) throw new Error("Missing environment variable: NEXT_PUBLIC_TRC20_CONTRACT_ADDRESS");

let TRC20_ADDRESS_HEX: string;
try {
    // Initialize TronWeb temporarily just for address conversion if needed early
    // This avoids needing a connected wallet instance for this utility function
    const staticTronWeb = new TronWeb({ fullHost: 'http://127.0.0.1' }); // Host doesn't matter here
    TRC20_ADDRESS_HEX = staticTronWeb.address.toHex(TRC20_ADDRESS_BASE58);
} catch (e) {
    console.error("Failed to convert TRC20 address to hex:", e);
    throw new Error(`Invalid NEXT_PUBLIC_TRC20_CONTRACT_ADDRESS format: ${TRC20_ADDRESS_BASE58}`);
}
// --- End Configuration ---


// --- Provider/Signer Getters ---

/**
 * Gets the Ethers provider from window.ethereum (MetaMask) or an external provider.
 */
export function getEthersProvider(externalProvider?: any): BrowserProvider | null {
    if (typeof window === 'undefined') return null; // Server-side guard

    const providerSource = externalProvider || window.ethereum;
    if (providerSource) {
        return new BrowserProvider(providerSource);
    }
    console.warn("MetaMask (window.ethereum) or compatible provider not found.");
    return null;
}

// Add a new function to get the signer
export async function getEthersSigner(externalProvider?: any): Promise<JsonRpcSigner | null> {
    const provider = getEthersProvider(externalProvider);
    if (!provider) return null;
    
    try {
        // This will trigger the wallet connection if not already connected
        const signer = await provider.getSigner();
        return signer;
    } catch (error) {
        console.error("Failed to get signer:", error);
        return null;
    }
}


/**
 * Gets the TronLink provider object from window.tronLink if available and ready.
 */
export function getTronLinkProvider(): TronLinkProvider | null {
     if (typeof window === 'undefined') return null; // Server-side guard    
     const tronLink = (window as any).tronLink as TronLinkProvider | undefined; // Cast for potential structure

     if (!tronLink) {
        console.warn("TronLink (window.tronLink) not found.");
        return null;
     }
     if (!tronLink.ready) {
        // TronLink exists but user might need to log in.
        console.warn("TronLink is installed but not ready. User might need to log in or setup.");
        // The hook/UI should ideally guide the user.
        return null; // Treat as unavailable if not ready
     }
      if (!tronLink.request) {
         console.error("TronLink found and ready, but 'request' method is missing.");
         return null; // Missing core functionality
     }
      if (!tronLink.tronWeb) {
         console.warn("TronLink found and ready, but 'tronWeb' instance is not yet injected. May need a short delay or re-check.");
         // Depending on requirements, you might return tronLink anyway, but check for tronWeb later
         // return tronLink;
         return null; // Safer to return null if tronWeb is expected immediately
     }

    return tronLink; // Return the full TronLink object
}
/**
 * Gets an instance of the BEP20 contract connected to a signer or provider.
 */
export function getBep20Contract(signerOrProvider: Signer | Provider) {
    return new Contract(
        BEP20_ADDRESS, 
        BEP20_ABI.abi,
        signerOrProvider
    );
}

/**
 * Gets an instance of the TRC20 contract using the injected TronWeb instance.
 */
export async function getTrc20Contract(tronWebInstance: TronWebInstance): Promise<any> { // tronWeb.contract returns 'any'
     if (!tronWebInstance?.contract) {
        throw new Error("TronWeb instance or its 'contract' method is not available.");
    }
    try {
        // TronWeb might cache instances based on address
        const contract = await tronWebInstance.contract(TRC20_ABI.abi, TRC20_ADDRESS_HEX);
        if (!contract?.methods) {
            throw new Error(`Failed to initialize TRC20 contract instance at ${TRC20_ADDRESS_BASE58}. Check ABI and address.`);
        }
        return contract;
    } catch (error) {
        console.error("Error getting TRC20 contract instance:", error);
        throw error; // Re-throw for handling upstream
    }
}

// --- Blockchain Interaction Functions ---
const provider = new BrowserProvider(window.ethereum);
/**
 * Mints BEP-20 tokens. Requires a connected Signer.
 */
// ... existing code ...
export async function mintBep20Tokens(recipient:any,amount: number) {
    try {
        // Ensure you have a signer from the wallet
        const signer = await provider.getSigner();
        console.log(BEP20_ADDRESS)
        const contract = new Contract(BEP20_ADDRESS, BEP20_ABI.abi, signer);
        
        // Call mint function
        const tx = await contract.mint(recipient,amount);
        await tx.wait();
        return tx;
    } catch (error : any) {
        if (error.message.includes("execution reverted")) {

            console.error("Only the owner can mint tokens.")
            error.message="Only the owner can mint tokens."
        }
        if (error.message.includes("user rejected action")) {
            console.error("Minting process was canceled by the user.");
            error.message = "You have canceled the minting process.";
        }
        
        console.error(error)
        throw error;
    }
}
/**
 * Mints TRC-20 tokens. Requires a ready TronWeb instance from TronLink.
 */
export async function mintTrc20Tokens(tronWebInstance: TronWebInstance, recipient: string, amount: string): Promise<string> {
     if (!tronWebInstance?.defaultAddress?.base58) {
         throw new Error("TronLink wallet instance with address is required for minting TRC-20 tokens.");
    }
    try {
        const contract = await getTrc20Contract(tronWebInstance);
        // --- IMPORTANT: Adjust decimals based on YOUR TRC20 token ---
        const tokenDecimals = 6; // Example: Assume 6 decimals. Fetch dynamically if possible!
        // ---
        const rawAmount = BigInt(Math.round(parseFloat(amount) * (10 ** tokenDecimals))).toString();

        console.log(`Minting TRC20: To=${recipient}, RawAmount=${rawAmount} (Decimals: ${tokenDecimals})`);

        // Ensure the method exists on the contract object
        if (!contract.methods.mint) {
            throw new Error("Contract ABI doesn't seem to have a 'mint(address,uint256)' function.");
        }

        const txID = await contract.methods.mint(recipient, rawAmount).send({
            feeLimit: 150_000_000, // ~150 TRX example, adjust based on testing
            callValue: 0,
            shouldPollResponse: false // Get txID fast, confirmation check separate if needed
        });

        console.log('TRC20 Mint Tx Sent:', txID);
        if (!txID || typeof txID !== 'string' || txID.length < 60) { // Basic sanity check for Tron TxID
             throw new Error('Invalid or missing transaction ID received from TronLink.');
        }
        return txID;
    } catch (error: any) {
        console.error('TRC20 Minting Error:', error);
        let errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        if (typeof error === 'object' && error !== null && error.message && 
            typeof error.message === 'string' && error.message.includes("does not exist")) {
            errorMessage = "Only the owner can mint tokens.";
        }
        throw new Error(errorMessage || 'TRC-20 minting failed');
    }
}


/**
 * Burns BEP-20 tokens from a target address. Requires allowance or special permission.
 */
export async function burnBep20Tokens(sign: Signer, targetAddress: string, amount: string): Promise<string> {
    if (!sign) throw new Error("A connected Signer (wallet) is required for burning BEP-20 tokens.");
    const signer = await provider.getSigner();
    const contract = new Contract(BEP20_ADDRESS, BEP20_ABI.abi, signer);
    try {
        const tx = await contract.burnFrom(targetAddress, amount);
        console.log('BEP20 Burn Tx Sent:', tx.hash);
        return tx.hash;
    } catch (error: any) {
        let message = error.shortMessage || error.message || 'BEP-20 burning failed';
        if (error.message.includes("execution reverted")) {
            
            console.error("BEP20 Burning Error: Only the owner can burn tokens.")
            message="Only the owner can burn tokens."
        }
        console.error('BEP20 Burning Error:', error);
        throw new Error(message);
    }
}

/**
 * Burns TRC-20 tokens from a target address. Requires burn permission in contract.
 */
export async function burnTrc20Tokens(tronWebInstance: TronWebInstance, targetAddress: string, amount: string): Promise<string> {
     if (!tronWebInstance?.defaultAddress?.base58) {
         throw new Error("TronLink wallet instance with address is required for burning TRC-20 tokens.");
    }
    try {
        const contract = await getTrc20Contract(tronWebInstance);
        // --- IMPORTANT: Adjust decimals based on YOUR TRC20 token ---
        const tokenDecimals = 6; // Example: Assume 6 decimals
        // ---
        const rawAmount = BigInt(Math.round(parseFloat(amount) * (10 ** tokenDecimals))).toString();

        console.log(`Burning TRC20: Target=${targetAddress}, RawAmount=${rawAmount} (Decimals: ${tokenDecimals})`);

        // --- IMPORTANT: Adjust method name 'burn' if your contract uses 'burnFrom' or similar ---
        if (!contract.methods.burnFrom) { // Adjust this line based on your contract's burn function name
            throw new Error("Contract ABI doesn't seem to have a 'burn(address,uint256)' function. Check ABI/Contract.");
        }
        // ---

        const txID = await contract.methods.burnFrom(targetAddress, rawAmount).send({ // Adjust method name if needed!
            feeLimit: 150_000_000, // Adjust fee limit
            callValue: 0,
            shouldPollResponse: false
        });

        console.log('TRC20 Burn Tx Sent:', txID);
         if (!txID || typeof txID !== 'string' || txID.length < 60) {
             throw new Error('Invalid or missing transaction ID received from TronLink.');
        }
        return txID;
    } catch (error: any) {
        console.error('TRC20 Burning Error:', error);
        let errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        
        // Check if error is an object and has a message property before trying to access it
        if (typeof error === 'object' && error !== null && error.message && 
            typeof error.message === 'string' && error.message.includes("does not exist")) {
            errorMessage = "Only the owner can burn tokens.";
        }
        
        throw new Error(errorMessage || 'TRC-20 burning failed');
    }
}

// --- Balance & Network Checks ---
export async function getBep20Balance(provider: any, address: string): Promise<string> {
    if (!provider) {
      console.error("Provider is null or undefined.");
      return "Error";
    }
    
    // More detailed debugging
    console.log("Provider type:", typeof provider);
    console.log("Provider keys:", Object.keys(provider));
    
    // Try to get a valid provider instance
    let readProvider;
    
    // Check if it's a Provider object
    if (provider.getNetwork && typeof provider.getNetwork === 'function') {
      console.log("Using direct provider");
      readProvider = provider;
    } 
    // Check if it's a Signer with a provider
    else if (provider.provider && typeof provider.provider.getNetwork === 'function') {
      console.log("Using signer's provider");
      readProvider = provider.provider;
    }
    // Check if it's ethers v6 Provider
    else if (provider._network && provider.getBlock) {
      console.log("Using ethers v6 provider");
      readProvider = provider;
    }
    // Check if it's a Web3Provider from a wallet connection
    else if (provider.getSigner && typeof provider.getSigner === 'function') {
      console.log("Using Web3Provider");
      readProvider = provider;
    }
    else {
      console.error("Provider validation failed. Provider details:", provider);
      return "Error";
    }
    
    try {
      console.log("Creating contract with address:", BEP20_ADDRESS);
      const contract = new Contract(BEP20_ADDRESS!, BEP20_ABI.abi, readProvider);
      console.log("Calling balanceOf for address:", address);
      const balanceWei = await contract.balanceOf(address);
      return formatEther(balanceWei);
    } catch (error: any) {
      console.error(`Error fetching BEP20 balance for ${address}:`, error);
      return "Error";
    }
  }

export async function getTrc20Balance(tronWebInstance: TronWebInstance, address: string): Promise<string> {
    console.log(tronWebInstance)
     if (!tronWebInstance) {
         console.error("TronWeb instance required to fetch TRC20 balance.");
         return "Error";
     }
    try {
        const contract = await getTrc20Contract(tronWebInstance);
        // Ensure method exists
         if (!contract.methods.balanceOf) {
            console.error("TRC20 contract instance missing 'balanceOf' method.");
            return "Error";
        }
        const rawBalance = await contract.methods.balanceOf(address).call();

        const tokenDecimals = 6; // **** FETCH OR DEFINE YOUR TOKEN'S DECIMALS ****
        // Use BigInt for intermediate calculation to avoid floating point issues if balance is large
        const balanceBigInt = BigInt(rawBalance.toString());
        const divisor = BigInt(10 ** tokenDecimals);
        // Format with decimals manually for potentially better precision control
        const integerPart = (balanceBigInt / divisor).toString();
        const fractionalPart = (balanceBigInt % divisor).toString().padStart(tokenDecimals, '0');
        // Remove trailing zeros from fractional part if desired
        const trimmedFractional = fractionalPart.replace(/0+$/, '');
        return trimmedFractional ? `${integerPart}.${trimmedFractional}` : integerPart;

    } catch (error: any) {
        console.error(`Error fetching TRC20 balance for ${address}:`, error.message);
        return "Error";
    }
}

export async function checkBscNetwork(provider: BrowserProvider): Promise<boolean> {
    if (!provider) return false;
    try {
        const network = await provider.getNetwork();
        return network.chainId === BigInt(BSC_CHAIN_ID);
    } catch (error) {
        console.error("Error checking BSC network:", error);
        return false;
    }
}

export function checkTronNetwork(tronWebInstance: TronWebInstance | null): boolean {
    if (!tronWebInstance?.fullNode?.host) {
        // Cannot determine network if instance or host info is missing
        return false;
    }
    const nodeHost = tronWebInstance.fullNode.host.toLowerCase();

    // Check against known mainnet/shasta URLs provided by TronGrid or official docs
    const mainnetHosts = ['api.trongrid.io', 'api.tronstack.io']; // Add more if needed
    const shastaHosts = ['api.shasta.trongrid.io'];

    if (ACTIVE_TRON_CHAIN_ID === 'TRON_MAINNET') {
        return mainnetHosts.some(host => nodeHost.includes(host));
    } else if (ACTIVE_TRON_CHAIN_ID === 'TRON_SHASTA') {
        return shastaHosts.some(host => nodeHost.includes(host));
    }

    console.warn(`Unrecognized ACTIVE_TRON_CHAIN_ID: ${ACTIVE_TRON_CHAIN_ID}. Cannot verify Tron network.`);
    return false; // Unknown target network
}

export async function requestNetworkSwitch(provider: BrowserProvider, chainId: number | string): Promise<void> {
     if (!provider?.send) {
         throw new Error("Wallet provider is not available or does not support 'send' method for switching network.");
     }
    const hexChainId = '0x' + BigInt(chainId).toString(16);
    try {
        console.log(`Requesting network switch to chainId: ${hexChainId}`);
        await provider.send('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
        console.log(`Successfully requested network switch.`);
    } catch (switchError: any) {
        console.error("Network switch error:", switchError);
        // Code 4902: Chain not added
        if (switchError.code === 4902) {
            console.log("Chain not found in wallet, attempting to add...");
            try {
                // --- Add Chain Parameters ---
                 if (chainId === BSC_CHAIN_ID) { // Add BSC Mainnet details
                    await provider.send('wallet_addEthereumChain', [
                        {
                            chainId: hexChainId,
                            chainName: 'BNB Smart Chain', // Official Name
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: [NEXT_PUBLIC_BSC_RPC_URL!], // Use configured RPC URL
                            blockExplorerUrls: ['https://bscscan.com'],
                        },
                    ]);
                     console.log("BSC network add request sent.");
                 }
                 // Add else if for BSC Testnet (97) if needed
                 /* else if (chainId === 97) { // BSC Testnet
                     await provider.send('wallet_addEthereumChain', [ ... testnet params ... ]);
                 } */
                 else {
                     throw new Error(`Configuration to add chainId ${chainId} is missing.`);
                 }
            } catch (addError: any) {
                console.error("Failed to add network:", addError);
                throw new Error(`Failed to add network: ${addError.message || 'Unknown error'}`);
            }
        } else {
             // Other errors (e.g., user rejection)
             throw new Error(`Failed to switch network: ${switchError.message || 'User rejected or unknown error'}`);
        }
    }
}

// Note: Tron network switching remains a manual user action within the TronLink extension.
// Your UI should detect the wrong network and prompt the user to switch manually.