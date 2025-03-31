'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction } from '@/lib/types';
import { Chain, EXPLORER_URLS } from '@/lib/constants';
import { formatTimestamp, truncateAddress, cn } from '@/lib/utils';
import Link from 'next/link';
import { Loader2, ExternalLink, Package, Flame } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  selectedChain: Chain;
}

export default function TransactionHistoryTable({ transactions, isLoading, selectedChain }: Props) {
  const getStatusBadgeVariant = (status: Transaction['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'success': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const shimmerClass = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Transaction History</h3>
      <div className="overflow-x-auto">
        <Table className="blueprint-table w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-white">Tran Hash</TableHead>
              <TableHead className="text-white">time</TableHead>
              <TableHead className="text-white">from</TableHead>
              <TableHead className="text-white">to</TableHead>
              <TableHead className="text-white">amount</TableHead>
              <TableHead className="text-white">gas fees</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell><div className={cn("h-4 w-24", shimmerClass)}></div></TableCell>
                  <TableCell><div className={cn("h-4 w-32", shimmerClass)}></div></TableCell>
                  <TableCell><div className={cn("h-4 w-24", shimmerClass)}></div></TableCell>
                  <TableCell><div className={cn("h-4 w-24", shimmerClass)}></div></TableCell>
                  <TableCell><div className={cn("h-4 w-16", shimmerClass)}></div></TableCell>
                  <TableCell><div className={cn("h-4 w-16", shimmerClass)}></div></TableCell>
                </TableRow>
              ))
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <TableRow key={tx._id} className="hover:bg-gray-900">
                  <TableCell className="font-mono text-xs">
                    <Link href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline text-blue-400">
                      {truncateAddress(tx.txHash)}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{formatTimestamp(tx.timestamp)}</TableCell>
                  <TableCell className="font-mono text-xs">{truncateAddress(tx.adminWallet)}</TableCell>
                  <TableCell className="font-mono text-xs">{truncateAddress(tx.recipient || tx.targetWallet)}</TableCell>
                  <TableCell className="font-medium">{tx.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-gray-400">{tx.action === 'mint' ? '0.001 BNB' : '0.002 BNB'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                  No transactions found for the selected chain.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {isLoading && !transactions.length && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}