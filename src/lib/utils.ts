
import { Chain } from './constants';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ethers } from 'ethers';
import TronWeb from 'tronweb';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Basic Address Validation (Refine as needed)
export function isValidAddress(address: string, chain: Chain): boolean {
  if (!address) return false;
  if (chain === 'BSC') {
    return ethers.isAddress(address);
  }
  if (chain === 'TRON') {
    // Basic check, tronWeb.isAddress is more reliable but might require instance
            //@ts-ignore
    return TronWeb.isAddress(address); // Requires TronWeb instance or static method availability
    // Fallback basic regex (less reliable):
    // return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  }
  return false;
}

export function formatTimestamp(isoDateString: string): string {
  try {
    return new Date(isoDateString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
  } catch (e) {
    return "Invalid Date";
  }
}

export function truncateAddress(address: string | null | undefined): string {
  if (!address) return "N/A";
  if (address.length < 10) return address; // Avoid truncating very short strings
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function calculateExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}