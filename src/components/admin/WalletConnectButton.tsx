'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useBlockchain } from '@/hooks/useBlockchain';
import { Chain, BSC_CHAIN_ID, ACTIVE_TRON_CHAIN_ID } from '@/lib/constants';
import { truncateAddress } from '@/lib/utils';
import { Loader2, LogOut, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  selectedChain: Chain;
  // Callbacks to inform the parent page
  onConnected: (address: string, provider: any, chain: Chain, wrongNetwork: boolean) => void;
  onDisconnected: () => void;
  // isWrongNetwork passed down from parent, based on selectedChain vs connected wallet chain
  isWrongNetwork: boolean;
}

export default function WalletConnectButton({ selectedChain, onConnected, onDisconnected, isWrongNetwork }: Props) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  const {
    connectWallet,
    disconnectWallet,
    switchNetwork,
    account,
    isConnected,
    isLoading,
    error,
    provider, // Get provider to pass back up
    chainId,
  } = useBlockchain();

  // Effect to notify parent component about connection state changes
  useEffect(() => {
    if (isConnected && account && provider && chainId) {
        let connectedActualChain: Chain | null = null;
        let wrongNetworkDetected = false;

        if (chainId === BSC_CHAIN_ID) {
            connectedActualChain = 'BSC';
            wrongNetworkDetected = selectedChain !== 'BSC';
        } else if (chainId === ACTIVE_TRON_CHAIN_ID) {
            connectedActualChain = 'TRON';
            wrongNetworkDetected = selectedChain !== 'TRON';
        }

        if(connectedActualChain) {
            onConnected(account, provider, connectedActualChain, wrongNetworkDetected);
        } else {
             // Handle case where connected to an unexpected chain ID
             console.warn("Connected to an unrecognized chain ID:", chainId);
             onConnected(account, provider, selectedChain, true); // Assume wrong network if unrecognized
        }

    } else if (!isConnected && !isLoading) { // Ensure disconnection notification only when not loading a connection attempt
      onDisconnected();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account, provider, chainId, isLoading, selectedChain]); // Dependencies track changes

  // Handle wallet connection
  const handleConnect = async () => {
    if (connectedAddress) {
      // Disconnect logic
      setConnectedAddress(null);
      onDisconnected();
      return;
    }

    setIsConnecting(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast({
          variant: "destructive",
          title: "Wallet Not Found",
          description: "Please install MetaMask or another compatible wallet."
        });
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      setConnectedAddress(address);
      
      // Pass the provider and address to parent component
      onConnected(address, window.ethereum, selectedChain, false);
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${truncateAddress(address)}`
      });
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || 'Failed to connect wallet'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitch = () => {
    switchNetwork(selectedChain);
  };

  if (isLoading) {
    return (
      <Button disabled variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && account) {
    return (
        <div className="flex items-center space-x-2">
             {isWrongNetwork ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={handleSwitch}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Wrong Network
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Click to switch to {selectedChain}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <span className="flex items-center px-3 py-1.5 text-sm font-medium border rounded-md bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200">
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600 dark:text-green-400"/>
                                {truncateAddress(account)} ({selectedChain})
                            </span>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>Connected as {account}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             )}
            <Button variant="outline" size="icon" onClick={disconnectWallet} aria-label="Disconnect Wallet">
                <LogOut className="h-4 w-4" />
            </Button>
             {error && <p className="text-xs text-red-500 ml-2">{error}</p>}
        </div>
    );
  }

  // Not connected
  return (
     <div className="flex flex-col items-end space-y-1">
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className={cn(
            "blueprint-button px-6 py-2",
            isWrongNetwork && "border-red-500",
            connectedAddress && !isWrongNetwork && "border-green-500"
          )}
        >
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {connectedAddress 
            ? (isWrongNetwork 
                ? `Wrong Network` 
                : `${truncateAddress(connectedAddress)}`)
            : 'connect wallet'}
        </Button>
         {error && <p className="text-xs text-red-500">{error}</p>}
     </div>
  );
}