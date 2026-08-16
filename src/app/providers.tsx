"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";
import { TokenCacheProvider } from "@/components/TokenCache";
import { NetworkProvider } from "@/components/NetworkProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={qc}>
          <NetworkProvider>
            <TokenCacheProvider>
              {children}
              <Toaster
                theme="system"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "var(--bg-elev)",
                    border: "1px solid var(--line)",
                    color: "var(--text)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                  },
                }}
              />
            </TokenCacheProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
