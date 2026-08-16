"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";
import { TokenCacheProvider } from "@/components/TokenCache";
import { NetworkProvider } from "@/components/NetworkProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <NetworkProvider>
          <TokenCacheProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#0c0c0c",
                  border: "1px solid #1c1c1c",
                  color: "#e8e4dc",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                },
              }}
            />
          </TokenCacheProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
