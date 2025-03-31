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
import { mintBep20Tokens, mintTrc20Tokens } from '@/lib/blockchain';
import { ethers } from 'ethers';
import { MintFormInputs } from '@/lib/types';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Props {
  selectedChain: Chain;
  connectedWallet: string | null;
  walletProvider: any | null;
  isWrongNetwork: boolean;
  onMintSuccess: () => void;
}

export default function MintPanel({ selectedChain, connectedWallet, walletProvider, isWrongNetwork, onMintSuccess }: Props) {
  const { toast } = useToast();
  const [isMinting, setIsMinting] = useState(false);

  // Form Validation Schema
  const MintSchema = z.object({
    recipient: z.string().trim().refine(
      (addr) => isValidAddress(addr, selectedChain),
      { message: `Invalid ${selectedChain} address format` }
    ),
    amount: z.string().refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      { message: 'Amount must be a positive number' }
    ),
    recipientEmail: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  });

  // React Hook Form
  const { register, handleSubmit, formState: { errors, isValid }, watch, reset, trigger } = useForm<MintFormInputs>({
    resolver: zodResolver(MintSchema),
    mode: 'onChange',
    defaultValues: {
      recipient: '',
      amount: '',
      recipientEmail: ''
    }
  });

  const watchedRecipient = watch('recipient');
  
  useEffect(() => {
    if(watchedRecipient) {
      trigger('recipient');
    }
  }, [selectedChain, trigger, watchedRecipient]);

  // Minting Logic
  const handleMintSubmit = async (data: MintFormInputs) => {
    if (!connectedWallet || !walletProvider || isWrongNetwork) {
      toast({ variant: "destructive", title: "Wallet Issue", description: "Please connect the correct wallet and network." });
      return;
    }
    setIsMinting(true);

    let txHash: string | undefined = undefined;

    try {
      // Perform Blockchain Transaction
      if (selectedChain === 'BSC') {
        txHash = await mintBep20Tokens(walletProvider, data.recipient, data.amount);
      } else {
        txHash = await mintTrc20Tokens(walletProvider, data.recipient, data.amount);
      }

      if (!txHash) {
        throw new Error('Transaction failed - no transaction hash returned');
      }

      // Record the transaction in our backend
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: data.recipient,
          amount: data.amount,
          chain: selectedChain,
          txHash,
          recipientEmail: data.recipientEmail || null,
        }),
      });

      const apiResult = await response.json();
      
      if (!response.ok) {
        throw new Error(apiResult.error || 'Failed to record mint transaction.');
      }

      toast({ 
        variant: "default", 
        title: "Mint Successful", 
        description: `Recorded Tx: ${truncateAddress(txHash)}` 
      });
      
      reset();
      onMintSuccess();

    } catch (error: any) {
      console.error("Minting failed:", error);
      toast({
        variant: "destructive",
        title: "Minting Failed",
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsMinting(false);
    }
  };

  const isSubmitDisabled = !isValid || isMinting || !connectedWallet || isWrongNetwork;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="h-8 w-1 "></div>
        <h2 className="text-3xl font-bold">mint tokens</h2>
      </div>
      
      <form onSubmit={handleSubmit(handleMintSubmit)}>
        <div className="space-y-6">
          {/* Connection Status */}
          {(!connectedWallet || isWrongNetwork) && (
            <div className="bg-gray-900 border border-gray-800 rounded-md p-3 text-sm">
              {!connectedWallet && <p className="text-amber-400">Please connect your wallet to mint tokens</p>}
              {isWrongNetwork && <p className="text-red-400">Please switch to the {selectedChain} network</p>}
            </div>
          )}

          {/* Recipient Address */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">recipient address</label>
            <Input
              id="recipient"
              placeholder={selectedChain === 'BSC' ? '0x...' : 'T...'}
              {...register('recipient')}
              className="blueprint-input h-12 text-lg"
              disabled={isMinting || !connectedWallet}
            />
            {errors.recipient && (
              <p className="text-sm text-red-400 mt-1">{errors.recipient.message}</p>
            )}
          </div>

          {/* Amount and Submit */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-gray-400">token amount</label>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="100"
                {...register('amount')}
                className="blueprint-input h-12 text-lg"
                disabled={isMinting || !connectedWallet}
              />
              {errors.amount && (
                <p className="text-sm text-red-400 mt-1">{errors.amount.message}</p>
              )}
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={isSubmitDisabled}
                className="blueprint-button h-12 px-6 min-w-[120px]"
              >
                {isMinting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center">
                    <span>mint</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </div>
          
          {/* Hidden email field */}
          <div className="hidden">
            <Input
              id="recipientEmail"
              type="email"
              {...register('recipientEmail')}
              disabled={isMinting || !connectedWallet}
            />
          </div>
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