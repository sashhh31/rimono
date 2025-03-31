// hooks/useBlockchain.ts

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Signer } from 'ethers';
// Import TronWeb type if @types/tronweb exists, otherwise rely on basic interface or 'any'
// import TronWeb from 'tronweb'; // If types installed
import { Chain, BSC_CHAIN_ID, ACTIVE_TRON_CHAIN_ID } from '@/lib/constants';
import {
    getEthersProvider,
    getEthersSigner,
    getTronLinkProvider, // Updated function that checks readiness
    checkBscNetwork,
    checkTronNetwork,
    requestNetworkSwitch,
    // Import the basic interfaces if not using @types/tronweb extensively elsewhere
    // TronWebInstance, TronLinkProvider
} from '@/lib/blockchain';

// Define basic Tron types here if needed, or import from lib/blockchain or lib/types
interface TronWebInstance { // Basic structure
    defaultAddress: { base58: string; hex: string };
    fullNode: { host: string };
    // Add other methods/properties used by the hook if necessary
}

// Interface for the hook's state and returned values
interface UseBlockchainState {
  provider: BrowserProvider | TronWebInstance | null; // Can hold either provider type
  signer: Signer | null; // Only relevant for EVM (BSC)
  account: string | null;
  chainId: number | string | null; // number (EVM) or string identifier (Tron)
  isConnected: boolean;
  isCorrectNetwork: boolean; // Is the connected network the one selected in the UI?
  isLoading: boolean; // Loading connection/action state
  error: string | null; // Error messages
  connectWallet: (chain: Chain) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chain: Chain) => Promise<void>;
}

export function useBlockchain(): UseBlockchainState {
  // State variables
  const [provider, setProvider] = useState<BrowserProvider | TronWebInstance | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | string | null>(null);
  const [targetChain, setTargetChain] = useState<Chain | null>(null); // Which chain are we trying to connect to?
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true); // Assume correct until checked
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Helper: Reset State ---
  const clearState = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setIsCorrectNetwork(true); // Reset to default assumption
    setError(null);
    // Keep targetChain? Maybe reset it too? Depends on desired UX on disconnect.
    // setTargetChain(null);
    console.log("Blockchain state cleared.");
  }, []);

  // --- Event Handlers ---
  // Handles account changes from Wallet
  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    console.log('handleAccountsChanged triggered:', accounts);
    if (!provider || !targetChain) return; // Need provider and target chain context

    if (accounts.length === 0) {
      // Wallet disconnected or locked
      console.log('Wallet disconnected or locked.');
      clearState();
    } else if (accounts[0] !== account) {
      // Account switched
      const newAccount = accounts[0];
      console.log(`Account changed to: ${newAccount}`);
      setAccount(newAccount);

      // Update signer/provider instance details if necessary
      if (targetChain === 'BSC' && provider instanceof BrowserProvider) {
          const newSigner = await getEthersSigner(provider);
          setSigner(newSigner); // Update signer for the new account
      } else if (targetChain === 'TRON') {
          // For Tron, the tronWeb instance usually remains the same,
          // just defaultAddress changes. We might need to re-fetch the instance
          // if the provider object structure changes significantly upon account switch.
          const tronLink = getTronLinkProvider();
          if (tronLink?.tronWeb && tronLink.tronWeb.defaultAddress.base58 === newAccount) {
                setProvider(tronLink.tronWeb as TronWebInstance); // Update provider state if needed
          } else {
               console.warn("TronWeb instance might be stale after account change, consider reconnecting.")
               // Optionally trigger a reconnect or state clear if tronWeb instance becomes invalid
               // clearState();
          }
      }
    }
  }, [account, provider, targetChain, clearState]); // Include dependencies

  // Handles network/chain changes from Wallet (Primarily for EVM like BSC)
  const handleChainChanged = useCallback(async (newChainIdHex: string) => {
    console.log('handleChainChanged triggered (EVM):', newChainIdHex);
    if (!provider || !(provider instanceof BrowserProvider) || targetChain !== 'BSC') {
      // Only handle if connected to BSC via Ethers provider
      return;
    }

    try {
        const newChainId = parseInt(newChainIdHex, 16);
        setChainId(newChainId);
        const isNowCorrect = newChainId === BSC_CHAIN_ID;
        setIsCorrectNetwork(isNowCorrect);
        console.log(`Network changed to ${newChainId}. Correct for BSC: ${isNowCorrect}`);

        if (isNowCorrect) {
             setError(null); // Clear previous network errors
             // Re-fetch signer as provider might be stale after network switch
             const newSigner = await getEthersSigner(provider);
             setSigner(newSigner);
        } else {
            setError(`Wallet connected to wrong network (ID: ${newChainId}). Please switch to BSC (ID: ${BSC_CHAIN_ID}).`);
            setSigner(null); // Invalidate signer if on wrong network
        }
    } catch (err) {
         console.error("Error processing chain change:", err);
         setError("Failed to process network change.");
    }

  }, [provider, targetChain]); // Include dependencies

   // Handles Tron specific events via 'message' listener
   const handleTronMessage = useCallback((event: MessageEvent) => {
        if (!targetChain || targetChain !== 'TRON' || event.source !== window || !event.data.message) {
            return; // Ignore irrelevant messages or if not targeting TRON
        }
        const message = event.data.message;
        console.log("Received message from TronLink:", message);

        // Account Change Detection
        if (message.action === "setAccount" && message.data.address && message.data.address !== account) {
             handleAccountsChanged([message.data.address]);
        }

        // Network Change Detection (Node Change)
        if (message.action === "setNode" && message.data.node?.fullNode) {
            console.log("TronLink node changed:", message.data.node.fullNode);
             // Re-check network correctness based on the new node URL
             const tronLink = getTronLinkProvider();
             if(tronLink?.tronWeb){
                 const isNowCorrect = checkTronNetwork(tronLink.tronWeb);
                 setIsCorrectNetwork(isNowCorrect);
                 if(!isNowCorrect){
                      setError(`Wallet connected to potentially wrong Tron network. Please ensure it's connected to ${ACTIVE_TRON_CHAIN_ID}.`);
                 } else {
                      setError(null); // Clear network error
                 }
             }
        }

        // Handle connection/disconnection events if provided by TronLink
        // Example: (These event names might not be exact, check TronLink docs/behavior)
        // if (message.action === "connect") { /* ... */ }
        // if (message.action === "disconnect") { handleAccountsChanged([]); }

   }, [account, targetChain, handleAccountsChanged]); // Include dependencies

  // --- Setup Event Listeners ---
  useEffect(() => {
    // --- MetaMask/EVM Listeners ---
    const eth = window.ethereum;
    if (eth && typeof eth.on === 'function' && typeof eth.removeListener === 'function') {
        // Use intermediate handlers to ensure correct `this` context and type safety if needed
        const accountsChangedHandler = (accounts: string[]) => handleAccountsChanged(accounts);
        const chainChangedHandler = (chainIdHex: string) => handleChainChanged(chainIdHex);

        eth.on('accountsChanged', accountsChangedHandler);
        eth.on('chainChanged', chainChangedHandler);
        console.log("Attached EVM listeners.");

         // --- TronLink Listener ---
         // TronLink communication is often via window.postMessage
         window.addEventListener('message', handleTronMessage);
         console.log("Attached Tron message listener.");

        // --- Cleanup Function ---
        return () => {
            if (eth && typeof eth.removeListener === 'function') {
                 eth.removeListener('accountsChanged', accountsChangedHandler);
                 eth.removeListener('chainChanged', chainChangedHandler);
                 console.log("Removed EVM listeners.");
            }
            window.removeEventListener('message', handleTronMessage);
            console.log("Removed Tron message listener.");
        };
    } else {
         console.warn("window.ethereum or its event methods not found. EVM listeners not attached.");
         // Still add Tron listener even if ethereum is missing
         window.addEventListener('message', handleTronMessage);
         console.log("Attached Tron message listener (Ethereum not found).");
         return () => {
             window.removeEventListener('message', handleTronMessage);
             console.log("Removed Tron message listener (Ethereum not found).");
         }
    }
  }, [handleAccountsChanged, handleChainChanged, handleTronMessage]); // Re-run if handlers change identity


  // --- Core Functions ---

  // Connect Wallet Logic
  const connectWallet = useCallback(async (chain: Chain) => {
    console.log(`Attempting to connect wallet for chain: ${chain}`);
    setIsLoading(true);
    setError(null);
    clearState(); // Reset previous state
    setTargetChain(chain); // Set the chain we are aiming for

    try {
      // --- BSC Connection ---
      if (chain === 'BSC') {
        const ethersProvider = getEthersProvider();
        if (!ethersProvider) throw new Error('MetaMask not found. Please install the extension.');

        // Request accounts first
        let currentAccount: string;
        try {
            const accounts = await ethersProvider.send('eth_requestAccounts', []);
             if (!accounts || accounts.length === 0) throw new Error('No accounts found or permission denied.');
             currentAccount = accounts[0];
             console.log("BSC Account connected:", currentAccount);
             setAccount(currentAccount);
        } catch (accError: any) {
             console.error("Error requesting accounts:", accError);
             throw new Error(accError.message || "Failed to connect account. User rejected or error occurred.");
        }

        // Check network
        const network = await ethersProvider.getNetwork();
        const currentChainId = Number(network.chainId);
        setChainId(currentChainId);
        const isCorrect = currentChainId === BSC_CHAIN_ID;
        setIsCorrectNetwork(isCorrect);
        setProvider(ethersProvider); // Set provider state

        if (isCorrect) {
            // Get signer only if on the correct network
            const ethersSigner = await getEthersSigner(ethersProvider);
            if(!ethersSigner) throw new Error("Could not get wallet signer after connecting.");
            setSigner(ethersSigner);
            console.log("Signer obtained for BSC.");
        } else {
             console.warn(`Connected to wrong network (ID: ${currentChainId}). Expected BSC (ID: ${BSC_CHAIN_ID}).`);
             setError(`Wallet connected to wrong network. Please switch to BSC (ID: ${BSC_CHAIN_ID}).`);
             setSigner(null); // Ensure signer is null if network is wrong
        }
        setIsConnected(true);

      // --- TRON Connection ---
      } else if (chain === 'TRON') {
        const tronLinkProvider = getTronLinkProvider(); // Checks for existence and readiness

        if (!tronLinkProvider) {
             // Error message depends on whether tronLink exists but isn't ready, or doesn't exist at all
            const message = (window as any).tronLink
                ? 'TronLink is not ready. Please log in or set it up.'
                : 'TronLink not found. Please install the extension.';
            throw new Error(message);
        }
        if (!tronLinkProvider.request) throw new Error("TronLink provider is missing the 'request' method.");

        // Request Accounts via TronLink specific method
        let tronWebInstance: TronWebInstance;
        try {
            const res = await tronLinkProvider.request({ method: 'tron_requestAccounts' });
            // Note: TronLink connection prompts might not happen if already approved.
            // Response code might be different across versions (e.g., sometimes no code, just address)
            console.log("TronLink requestAccounts response:", res);

            // Re-fetch tronWeb instance AFTER connection attempt, it might be injected now
            const currentTronLink =  (window as any).tronLink; // Re-check
            if (!currentTronLink?.tronWeb?.defaultAddress?.base58) {
                 // Attempt a small delay and retry fetching tronWeb, sometimes injection isn't immediate
                 await new Promise(resolve => setTimeout(resolve, 300));
                 if (! (window as any).tronLink?.tronWeb?.defaultAddress?.base58) {
                    console.error("TronWeb instance or default address not found after connection request.", (window as any).tronLink);
                    throw new Error("Failed to get Tron account details after connecting. Try refreshing.");
                 }
            }
             tronWebInstance = currentTronLink.tronWeb as TronWebInstance; // Assume structure now
             console.log("TRON Account connected:", tronWebInstance.defaultAddress.base58);
             setAccount(tronWebInstance.defaultAddress.base58);

        } catch (tronError: any) {
             console.error("Error requesting Tron accounts:", tronError);
             const message = tronError.message || (typeof tronError === 'string' ? tronError : "Failed to connect Tron account. User rejected or error occurred.");
             throw new Error(message);
        }


        // Set provider state and check network
        setProvider(tronWebInstance);
        setChainId(ACTIVE_TRON_CHAIN_ID); // Use our defined identifier
                //@ts-ignore
        const isCorrect = checkTronNetwork(tronWebInstance);
        setIsCorrectNetwork(isCorrect);

        if (!isCorrect) {
             console.warn(`Connected to potentially wrong Tron network node: ${tronWebInstance.fullNode.host}`);
             setError(`Wallet connected to potentially wrong Tron network. Ensure it's connected to ${ACTIVE_TRON_CHAIN_ID}.`);
        } else {
             console.log("Connected to correct Tron network node.");
        }
         setIsConnected(true);
      }

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'An unknown error occurred during connection.');
      clearState(); // Ensure state is cleared on connection failure
    } finally {
      setIsLoading(false);
    }
  }, [clearState]); // Include dependencies


  // Disconnect Wallet
  const disconnectWallet = useCallback(() => {
    console.log('Disconnecting wallet requested (clearing state)...');
    // Actual disconnection is handled by user in wallet extension.
    clearState();
    // Optionally, notify parent component if needed.
  }, [clearState]);


  // Switch Network Logic
  const switchNetwork = useCallback(async (chain: Chain) => {
    setError(null); // Clear previous errors
    setIsLoading(true);

    if (!provider || !isConnected) {
      setError("Wallet not connected. Cannot switch network.");
      setIsLoading(false);
      return;
    }

    console.log(`Requesting network switch to: ${chain}`);
    setTargetChain(chain); // Update the target chain

    try {
      // --- BSC Network Switch ---
      if (chain === 'BSC') {
        if (!(provider instanceof BrowserProvider)) {
            throw new Error("Cannot switch EVM network: Not connected via Ethers provider.");
        }
        await requestNetworkSwitch(provider, BSC_CHAIN_ID);
        // Event listener 'handleChainChanged' should ideally update the state.
        // But we can optimistically check/update state here too after the request.
        const network = await provider.getNetwork();
        const newChainId = Number(network.chainId);
        const isNowCorrect = newChainId === BSC_CHAIN_ID;
        setChainId(newChainId);
        setIsCorrectNetwork(isNowCorrect);
        if (isNowCorrect) {
             const newSigner = await getEthersSigner(provider);
             setSigner(newSigner); // Refresh signer
        } else {
             setSigner(null);
             setError(`Failed to switch to BSC or user rejected. Current Network ID: ${newChainId}.`);
        }

      // --- TRON Network Switch ---
      } else if (chain === 'TRON') {
        // Programmatic switching is not standard in TronLink. Prompt user.
        console.log("Prompting user to switch network manually in TronLink.");
        setError(`Please switch network manually to ${ACTIVE_TRON_CHAIN_ID} in your TronLink extension.`);
         // Re-check the network after a short delay, assuming user might switch
         setTimeout(() => {
             if(provider && !(provider instanceof BrowserProvider)){ // Check provider is TronWebInstance
                      //@ts-ignore

                const isNowCorrect = checkTronNetwork(provider as TronWebInstance);
                setIsCorrectNetwork(isNowCorrect);
                if(isNowCorrect){
                     setError(null); // Clear error if user switched successfully
                }
             }
         }, 3000); // Check again after 3 seconds
      }
    } catch (err: any) {
      console.error("Switch network error:", err);
      setError(`Failed to switch network: ${err.message || 'Please try manually.'}`);
      // Attempt to update network state even on error
       if (provider instanceof BrowserProvider) {
           try {
                const network = await provider.getNetwork();
                setChainId(Number(network.chainId));
                setIsCorrectNetwork(Number(network.chainId) === BSC_CHAIN_ID);
           } catch {}
       } else if (provider){ // TronWebInstance
        //@ts-ignore
            setIsCorrectNetwork(checkTronNetwork(provider as TronWebInstance));
       }
    } finally {
      setIsLoading(false);
    }
  }, [provider, isConnected]); // Include dependencies


  // --- Return Hook State and Functions ---
  return {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isCorrectNetwork,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
}