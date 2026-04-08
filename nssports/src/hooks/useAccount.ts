"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/clientAuth";
import { getAccount } from "@/lib/localDb";
import type { Account } from "@/types";

export const ACCOUNT_QUERY_KEY = ["account"] as const;

export function useAccount() {
  const { status, data: session } = useSession();
  
  return useQuery<Account>({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: async () => {
      const userId = session?.user?.id || 'demo-user-id';
      const account = getAccount(userId);
      if (!account) throw new Error("Account not found");
      return account as Account;
    },
    enabled: status === "authenticated" && !!session?.user?.id,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
}
