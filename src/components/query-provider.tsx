"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { retryDelayMs, shouldRetry } from "@/lib/anilist/retry";

// In memory only, for the session: nothing is persisted (ADR-0004). No refetch on focus: no polling (ADR-0003).
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
            retryDelay: retryDelayMs,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
