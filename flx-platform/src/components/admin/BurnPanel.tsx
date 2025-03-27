'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Chain } from '@/lib/constants';
import { isValidAddress } from '@/lib/utils';
import { burnBep20Tokens, burnTrc20Tokens, getBep20Balance, getTrc20Balance } from '@/lib/blockchain';
import { ethers } from 'ethers';
import { BurnFormInputs } from '@/lib/types';
import { Loader2, Flame } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Props {
  selectedChain: Chain;
  connectedWallet: string | null;
  walletProvider: any | null;
  isWrongNetwork: boolean;
  recentAddresses: string[];
  onBurnSuccess: () => void;
}

export default function BurnPanel({ selectedChain, connectedWallet, walletProvider, isWrongNetwork, recentAddresses, onBurnSuccess }: Props) {
  const { toast } = useToast();
  const [isBurning, setIsBurning] = useState(false);
  const [confirmingBurn, setConfirmingBurn] = useState(false);
  const [targetBalance, setTargetBalance] = useState<string | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);

  // Form Validation Schema
  const BurnSchema = z.object({
    targetWallet: z.string().trim().refine(
      (addr) => isValidAddress(addr, selectedChain),
      { message: `Invalid ${selectedChain} address format` }
    ),
    amount: z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      { message: 'Amount must be a positive number' }
    ).refine(
      (val) => targetBalance === null || parseFloat(val) <= parseFloat(targetBalance),
      { message: 'Amount exceeds target wallet balance' }
    ),
  });

  // React Hook Form
  const { register, handleSubmit, formState: { errors, isValid }, watch, reset, trigger, setValue, getValues } = useForm<BurnFormInputs>({
    resolver: zodResolver(BurnSchema),
    mode: 'onChange',
    defaultValues: {
      targetWallet: '',
      amount: '',
    }
  });

  const watchedTargetWallet = watch('targetWallet');

  // Check balance when target wallet changes
  useEffect(() => {
    const checkBalance = async () => {
      if (watchedTargetWallet && isValidAddress(watchedTargetWallet, selectedChain) && connectedWallet && walletProvider && !isWrongNetwork) {
        setFetchingBalance(true);
        setTargetBalance(null);
        try {
          let balance: string;
          if (selectedChain === 'BSC') {
            balance = await getBep20Balance(walletProvider, watchedTargetWallet);
          } else {
            balance = await getTrc20Balance(walletProvider, watchedTargetWallet);
          }
          setTargetBalance(balance);
          // Re-validate amount field since balance is a dependency
          trigger('amount');
        } catch (error) {
          console.error("Error fetching balance:", error);
          setTargetBalance(null);
        } finally {
          setFetchingBalance(false);
        }
      }
    };

    checkBalance();
  }, [watchedTargetWallet, selectedChain, connectedWallet, walletProvider, isWrongNetwork, trigger]);

  // Reset confirmation state when form values change
  useEffect(() => {
    if (confirmingBurn) {
      setConfirmingBurn(false);
    }
  }, [watch('targetWallet'), watch('amount')]);

  // Burning Logic
  const handleBurnSubmit = async (data: BurnFormInputs) => {
    if (!connectedWallet || !walletProvider || isWrongNetwork) {
      toast({ variant: "destructive", title: "Wallet Issue", description: "Please connect the correct wallet and network." });
      return;
    }

    // First click - show confirmation
    if (!confirmingBurn) {
      setConfirmingBurn(true);
      return;
    }

    // Second click - proceed with burn
    setIsBurning(true);

    let txHash: string | undefined = undefined;

    try {
      // Perform Blockchain Transaction
      if (selectedChain === 'BSC') {
        txHash = await burnBep20Tokens(walletProvider, data.targetWallet, parseFloat(data.amount));
      } else {
        txHash = await burnTrc20Tokens(walletProvider, data.targetWallet, parseFloat(data.amount));
      }

      if (!txHash) {
        throw new Error('Transaction failed - no transaction hash returned');
      }

      // Record the transaction in our backend
      const response = await fetch('/api/burn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: data.targetWallet,
          amount: parseFloat(data.amount),
          chain: selectedChain,
          txHash,
        }),
      });

      const apiResult = await response.json();
      
      if (!response.ok) {
        throw new Error(apiResult.error || 'Failed to record burn transaction.');
      }

      toast({ 
        variant: "success", 
        title: "Burn Successful", 
        description: `Recorded Tx: ${truncateAddress(txHash)}` 
      });
      
      reset();
      onBurnSuccess();
      setTargetBalance(null);

    } catch (error: any) {
      console.error("Burning failed:", error);
      toast({
        variant: "destructive",
        title: "Burning Failed",
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsBurning(false);
      setConfirmingBurn(false);
    }
  };

  const isSubmitDisabled = !isValid || isBurning || !connectedWallet || isWrongNetwork;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(handleBurnSubmit)}>
        <div className="space-y-6">
          {/* Connection Status */}
          {(!connectedWallet || isWrongNetwork) && (
            <div className="bg-gray-900 border border-gray-800 rounded-md p-3 text-sm">
              {!connectedWallet && <p className="text-amber-400">Please connect your wallet to burn tokens</p>}
              {isWrongNetwork && <p className="text-red-400">Please switch to the {selectedChain} network</p>}
            </div>
          )}

          {/* Target Wallet Address */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">wallet address to burn from</label>
            <Input
              id="targetWallet"
              placeholder={selectedChain === 'BSC' ? '0x...' : 'T...'}
              {...register('targetWallet')}
              className="blueprint-input h-12 text-lg"
              disabled={isBurning || !connectedWallet}
            />
            {fetchingBalance && (
              <div className="flex items-center mt-1">
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                <span className="text-xs text-gray-400">Checking balance...</span>
              </div>
            )}
            {!fetchingBalance && targetBalance !== null && (
              <p className="text-xs text-gray-400 mt-1">Available: {targetBalance} tokens</p>
            )}
            {errors.targetWallet && (
              <p className="text-sm text-red-400 mt-1">{errors.targetWallet.message}</p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">amount to burn</label>
            <Input
              id="burnAmount"
              type="number"
              step="any"
              placeholder="50"
              {...register('amount')}
              className="blueprint-input h-12 text-lg"
              disabled={isBurning || !connectedWallet}
            />
            {errors.amount && (
              <p className="text-sm text-red-400 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Burn Button */}
          <Button
            type="submit"
            variant={confirmingBurn ? "destructive" : "default"}
            disabled={isSubmitDisabled}
            className={cn(
              "blueprint-button w-full h-12 mt-2",
              confirmingBurn && "bg-red-900/20 border-red-500 hover:bg-red-900/30"
            )}
          >
            {isBurning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center justify-center">
                <Flame className={cn("h-4 w-4 mr-2", confirmingBurn && "text-red-400 animate-pulse")} />
                <span>{confirmingBurn ? 'confirm burn' : 'burn'}</span>
              </div>
            )}
          </Button>
          
          {confirmingBurn && !isBurning && (
            <p className="text-center text-sm text-red-400 animate-pulse mt-2">
              This action is irreversible. Click again to confirm.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// Helper function for truncating addresses
function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}