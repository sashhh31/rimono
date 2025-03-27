// src/components/admin/ChainSelector.tsx
'use client'; // This component needs client-side interaction (onClick)

import React from 'react';
import { Button } from '@/components/ui/button'; // ShadCN Button
import { Chain } from '@/lib/constants'; // Type 'BSC' | 'TRON'
import { cn } from '@/lib/utils'; // Utility for conditional classes
import { Info } from 'lucide-react'; // Info icon for tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // ShadCN Tooltip

// Define the props the component expects
interface Props {
  selectedChain: Chain; // The currently selected chain ('BSC' or 'TRON')
  onChainChange: (chain: Chain) => void; // Callback function when a chain is selected
}

const chains: Chain[] = ['BSC', 'TRON']; // Define the available chains

export default function ChainSelector({ selectedChain, onChainChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center text-3xl font-bold mb-4">select chain</div>
      
      {/* BEP-20 Button */}
      <Button
        variant="outline"
        onClick={() => onChainChange('BSC')}
        className={cn(
          "blueprint-button w-full p-5 text-xl relative",
          selectedChain === 'BSC' && "chain-button-selected"
        )}
        aria-pressed={selectedChain === 'BSC'}
      >
        bep-20
        {selectedChain === 'BSC' && (
          <div className="absolute inset-0 rounded-lg chain-button-glow"></div>
        )}
      </Button>
      
      <div className="text-center text-lg my-2">or</div>
      
      {/* TRC-20 Button */}
      <Button
        variant="outline"
        onClick={() => onChainChange('TRON')}
        className={cn(
          "blueprint-button w-full p-5 text-xl relative",
          selectedChain === 'TRON' && "chain-button-selected"
        )}
        aria-pressed={selectedChain === 'TRON'}
      >
        trc-20
        {selectedChain === 'TRON' && (
          <div className="absolute inset-0 rounded-lg chain-button-glow"></div>
        )}
      </Button>

      {/* Tooltip Provider: Wraps the tooltip components */}
      <TooltipProvider delayDuration={100}>
        {/* Tooltip: Main container */}
        <Tooltip>
          {/* TooltipTrigger: The element that triggers the tooltip on hover/focus */}
          <TooltipTrigger asChild>
            {/* Use the Info icon as the trigger */}
            <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" aria-label="Gas fee information"/>
          </TooltipTrigger>
          {/* TooltipContent: The content displayed inside the tooltip */}
          <TooltipContent>
            <p className="text-xs max-w-xs">
              Gas fees apply for transactions.
              BEP-20 (BSC) uses BNB.
              TRC-20 (TRON) uses TRX (Energy/Bandwidth).
              Ensure your admin wallet has sufficient native tokens for the selected chain.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}