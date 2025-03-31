'use client'; // This page needs client-side interactivity

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import WalletConnectButton from '@/components/admin/WalletConnectButton';
import ChainSelector from '@/components/admin/ChainSelector';
import MintPanel from '@/components/admin/MintPanel';
import TransactionHistoryTable from '@/components/admin/TransactionHistoryTable';
import BurnPanel from '@/components/admin/BurnPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Chain } from '@/lib/constants'; // Define Chain type ('BSC' | 'TRON')
import type { Transaction } from '@/lib/types'; // Define Transaction type

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [selectedChain, setSelectedChain] = useState<Chain>('BSC');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<any | null>(null); // ethers provider or tronWeb instance
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Function to fetch transactions from backend API
  const fetchTransactions = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      // Construct URL based on selectedChain and potentially pagination
      const response = await fetch(`/api/transactions?chain=${selectedChain}&limit=50`); // Add pagination later
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions || []); // Assuming API returns { transactions: [...] }
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      // Optionally show a toast notification for fetch errors
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedChain]); // Re-fetch when chain changes

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTransactions(); // Fetch on initial load and chain change

    const intervalId = setInterval(fetchTransactions, 15000); // Auto-refresh every 15 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [fetchTransactions]); // Dependency array includes the memoized fetch function

  // Handle chain selection change
  const handleChainChange = (chain: Chain) => {
    setSelectedChain(chain);
    // Reset wallet connection state or trigger re-verification
    setConnectedWallet(null);
    setWalletProvider(null);
    setIsWrongNetwork(false);
    // Transactions will auto-refetch due to useEffect dependency
  };

  // Callback for successful wallet connection
  const onWalletConnected = (address: string, provider: any, chain: Chain, wrongNetwork: boolean) => {
    if (chain === selectedChain) {
        setConnectedWallet(address);
        setWalletProvider(provider);
        setIsWrongNetwork(wrongNetwork);
    } else {
        // Handle case where connected wallet's chain doesn't match selectedChain
        console.warn("Connected wallet chain mismatch");
        // Potentially force user to switch chain selection or wallet network
        setIsWrongNetwork(true); // Indicate mismatch
    }
  };

  // Callback for wallet disconnection
  const onWalletDisconnected = () => {
      setConnectedWallet(null);
      setWalletProvider(null);
      setIsWrongNetwork(false);
  };

  // Function to manually refresh transactions (e.g., after mint/burn)
  const refreshTransactions = () => {
    fetchTransactions();
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading session...</div>;
  }

  // Note: The layout already handles redirection if status is 'unauthenticated'

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold text-white">Rimon</h1>
        <WalletConnectButton
          selectedChain={selectedChain}
          onConnected={onWalletConnected}
          onDisconnected={onWalletDisconnected}
          isWrongNetwork={isWrongNetwork}
        />
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Input and Mint */}
        <div className="md:col-span-2 space-y-6">
          {/* Recipient Address Input */}
          <Card className="blueprint-card">
            <CardContent className="p-4">
              <MintPanel
                selectedChain={selectedChain}
                connectedWallet={connectedWallet}
                walletProvider={walletProvider}
                isWrongNetwork={isWrongNetwork}
                onMintSuccess={refreshTransactions}
              />
            </CardContent>
          </Card>
          
          {/* Transaction History */}
          <Card className="blueprint-card">
            <CardContent className="p-4">
              <TransactionHistoryTable
                transactions={transactions}
                isLoading={isLoadingHistory}
                selectedChain={selectedChain}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Chain Selection and Burn */}
        <div className="space-y-6">
          {/* Chain Selector */}
          <Card className="blueprint-card">
            <CardContent className="p-6">
              <ChainSelector selectedChain={selectedChain} onChainChange={handleChainChange} />
            </CardContent>
          </Card>
          
          {/* Burn Panel */}
          <Card className="blueprint-card">
            <CardContent className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Burn token manually</h3>
              <BurnPanel
                selectedChain={selectedChain}
                connectedWallet={connectedWallet}
                walletProvider={walletProvider}
                isWrongNetwork={isWrongNetwork}
                onBurnSuccess={refreshTransactions}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}