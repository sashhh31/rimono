import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "@/components/providers/NextAuthProvider"; // Client component provider
import { Toaster } from "@/components/ui/toaster" // For ShadCN toasts

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rimon - Token Minting Platform",
  description: "Admin platform for minting time-limited tokens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white`}>
        <NextAuthProvider> {/* Wrap with session provider */}
          {/* Add ThemeProvider from ShadCN if using themes */}
          {children}
          <Toaster /> {/* Place Toaster here for global notifications */}
        </NextAuthProvider>
      </body>
    </html>
  );
}