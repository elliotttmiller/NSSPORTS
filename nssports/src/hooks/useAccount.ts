"use client";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "@/types";
import { AccountSchema } from "@/lib/schemas/account";

export const ACCOUNT_QUERY_KEY = ["account"] as const;

export function useAccount() {
	return useQuery<Account>({
		queryKey: ACCOUNT_QUERY_KEY,
		queryFn: async () => {
			const res = await fetch("/api/account", { cache: "no-store" });
			if (!res.ok) throw new Error("Failed to fetch account");
			const json = await res.json();
			const payload = json?.data ?? json;
			return AccountSchema.parse(payload) as Account;
		},
		refetchOnWindowFocus: true,
		refetchInterval: 5000, // Poll every 5 seconds for real-time updates
		staleTime: 0, // Always consider data stale to ensure fresh fetches
	});
}


