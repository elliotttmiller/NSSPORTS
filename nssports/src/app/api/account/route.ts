import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse, ApiErrors } from "@/lib/apiResponse";
import { AccountSchema } from "@/lib/schemas";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authHelpers";

export async function GET() {
	return withErrorHandling(async () => {
		const userId = await getAuthUser();

		let balance = 0;
		let risk = 0;
		let available = 0;
		let freePlay = 0;

		try {
			const account = await prisma.account.findUnique({ where: { userId } }) as { userId: string; balance: number; freePlay?: number; createdAt: Date; updatedAt: Date } | null;
			const cashBalance = account ? Number(account.balance) : 0;
			freePlay = account ? Number(account.freePlay ?? 0) : 0;
			// Total balance includes both cash and freeplay
			balance = cashBalance + freePlay;

			const pendingBets = await prisma.bet.findMany({
				where: { userId, status: "pending" },
				select: { stake: true },
			});
			risk = pendingBets.reduce((s, b) => s + Number(b.stake), 0);
			// Available = Total Balance (cash + freeplay) - Risk
			available = Math.max(0, balance - risk);
		} catch (err) {
			// If the accounts table is missing, gracefully return zeros
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
				balance = 0;
				risk = 0;
				available = 0;
				freePlay = 0;
			} else {
				throw err;
			}
		}

		try {
			const payload = AccountSchema.parse({ userId, balance, available, risk, freePlay });
			return successResponse(payload);
		} catch (e) {
			if (e instanceof z.ZodError) {
				return ApiErrors.unprocessable('Account payload validation failed', e.errors);
			}
			throw e;
		}
	});
}

