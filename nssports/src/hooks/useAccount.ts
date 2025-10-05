"use client";
import { useQuery } from "@tanstack/react-query";

export type AccountSummary = {
  userId: string;
  balance: number;
  available: number;
  risk: number;
};

export const ACCOUNT_QUERY_KEY = ["account"] as const;

export function useAccount() {
  return useQuery<AccountSummary>({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/account", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch account");
  const json = await res.json();
  return (json?.data ?? json) as AccountSummary;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
