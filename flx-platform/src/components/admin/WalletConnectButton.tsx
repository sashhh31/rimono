'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  selectedChain: Chain;
  onConnected: (address: string, provider: any, chain: Chain, wrongNetwork: boolean) => void;
  onDisconnected: () => void;
  isWrongNetwork: boolean;
}

export default function WalletConnectButton({ selectedChain, onConnected, onDisconnected, isWrongNetwork }: Props) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [tronWebAvailable, setTronWebAvailable] = useState(false);

  const {
    connectWallet,
    disconnectWallet,
    switchNetwork,
    account,
    isConnected,
    isLoading,
    error,
    provider,
    chainId,
  } = useBlockchain();

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

      if (connectedActualChain) {
        onConnected(account, provider, connectedActualChain, wrongNetworkDetected);
      } else {
        console.warn('Connected to an unrecognized chain ID:', chainId);
        onConnected(account, provider, selectedChain, true);
      }
    } else if (!isConnected && !isLoading) {
      onDisconnected();
    }
  }, [isConnected, account, provider, chainId, isLoading, selectedChain]);

  useEffect(() => {


    const checkTronWeb = () => {
      if ((window as any).tronWeb && (window as any).tronWeb.defaultAddress.base58) {
        setTronWebAvailable(true);
      } else {
        setTimeout(checkTronWeb, 500); // Retry every 500ms
      }
    };

    checkTronWeb();
  }, []);

  const handleConnect = async () => {
    if (connectedAddress) {
      setConnectedAddress(null);
      onDisconnected();
      return;
    }
  
    setIsConnecting(true);
  
    try {
      let address: string | null = null;
      let provider: any = null;
  
      // 🟢 **BSC (MetaMask) Handling**
      if (selectedChain === "BSC") {
        if (!window.ethereum) {
          toast({
            variant: "destructive",
            title: "MetaMask Not Found",
            description: "Please install MetaMask for BSC support."
          });
          return;
        }
  
        // Request accounts from MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) throw new Error('No accounts found');
  
        address = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
      }
  
      // 🔴 **TRON (TronLink) Handling**
      else if (selectedChain === "TRON") {
        if (!(window as any).tronWeb || !(window as any).tronLink) {
          toast({
            variant: "destructive",
            title: "TronLink Not Found",
            description: "Please install TronLink for TRON support."
          });
          return;
        }
  
        // Check if TronLink is unlocked
        // if (!(window as any).tronLink ) {
        //   console.log(window.tronLink);
        //   toast({
        //     variant: "destructive",
        //     title: "TronLink Locked",
        //     description: "Please unlock TronLink."
        //   });
        //   return;
        // }

  
        try {
          // Request account permission
          await (window as any).tronLink.request({ method: 'tron_requestAccounts' });
  
          // Retrieve the connected Tron address
          address = (window as any).tronWeb.defaultAddress.base58;
          provider = (window as any).tronWeb;
  
          if (!address) {
            throw new Error("Failed to fetch Tron wallet address.");
          }
        } catch (tronError: any) {
          console.error("TronLink connection error:", tronError);
          toast({
            variant: "destructive",
            title: "TronLink Connection Failed",
            description: (tronError?.message ? tronError.message + " please check if TronLink is unlocked" 
              : "Failed to connect to TronLink. Please check if TronLink is unlocked.")
           });
          return; // Exit function if connection fails
        }
      }
  
      if (!address) {
        throw new Error("Could not retrieve wallet address");
      }
  
      setConnectedAddress(address);
      onConnected(address, provider, selectedChain, false);
  
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
  

  const handleSwitch = () => switchNetwork(selectedChain);

  if (isLoading) {
    return (
      <Button disabled variant='outline'>
        <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Connecting...
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <div className='flex items-center space-x-2'>
        {isWrongNetwork ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='destructive' size='sm' onClick={handleSwitch}>
                  <AlertTriangle className='mr-2 h-4 w-4' /> Wrong Network
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
                <span className='flex items-center px-3 py-1.5 text-sm font-medium border rounded-md bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'>
                  <CheckCircle className='mr-2 h-4 w-4 text-green-600 dark:text-green-400' />
                  {truncateAddress(account)} ({selectedChain})
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Connected as {account}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button variant='outline' size='icon' onClick={disconnectWallet}>
          <LogOut className='h-4 w-4' />
        </Button>
        {error && <p className='text-xs text-red-500 ml-2'>{error}</p>}
      </div>
    );
  }

  return (
    <div className='flex flex-col items-end space-y-1'>
      <Button onClick={handleConnect} disabled={isConnecting} className={cn('px-6 py-2', isWrongNetwork && 'border-red-500', connectedAddress && !isWrongNetwork && 'border-green-500')}>
        {isConnecting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />} {connectedAddress ? (isWrongNetwork ? 'Wrong Network' : truncateAddress(connectedAddress)) : 'Connect Wallet'}
      </Button>
      {error && <p className='text-xs text-red-500'>{error}</p>}
    </div>
  );
}