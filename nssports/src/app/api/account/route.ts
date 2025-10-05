import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse } from "@/lib/apiResponse";

// In a real app, derive userId from auth; for now default to 'demo-user'
const getUserId = async (): Promise<string> => {
  return "demo-user";
};

export async function GET() {
  return withErrorHandling(async () => {
    const userId = await getUserId();

    // Fetch base balance (guard until prisma generate/migrate introduces Account)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const account = prismaAny.account
      ? await prismaAny.account.findUnique({ where: { userId } })
      : null;
    const balance = account ? Number(account.balance) : 0;

    // Compute risk from pending bets (sum of stakes)
    const pendingBets = await prisma.bet.findMany({
      where: { userId, status: "pending" },
      select: { stake: true },
    });
    const risk = pendingBets.reduce((sum, b) => sum + Number(b.stake), 0);
    const available = Math.max(0, balance - risk);

    return successResponse<{ userId: string; balance: number; available: number; risk: number }>({
      userId,
      balance,
      available,
      risk,
    });
  });
}
