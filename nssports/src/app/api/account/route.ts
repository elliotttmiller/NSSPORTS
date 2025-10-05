import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse, ApiErrors } from "@/lib/apiResponse";
import { AccountSchema } from "@/lib/schemas";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// TODO: Replace with real auth-derived user id
const getUserId = async () => "demo-user";

export async function GET() {
	return withErrorHandling(async () => {
		const userId = await getUserId();

		let balance = 0;
		let risk = 0;
		let available = 0;

		try {
			const account = await prisma.account.findUnique({ where: { userId } });
			balance = account ? Number(account.balance) : 0;

			const pendingBets = await prisma.bet.findMany({
				where: { userId, status: "pending" },
				select: { stake: true },
			});
			risk = pendingBets.reduce((s, b) => s + Number(b.stake), 0);
			available = Math.max(0, balance - risk);
		} catch (err) {
			// If the accounts table is missing, gracefully return zeros
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
				balance = 0;
				risk = 0;
				available = 0;
			} else {
				throw err;
			}
		}

		try {
			const payload = AccountSchema.parse({ userId, balance, available, risk });
			return successResponse(payload);
		} catch (e) {
			if (e instanceof z.ZodError) {
				return ApiErrors.unprocessable('Account payload validation failed', e.errors);
			}
			throw e;
		}
	});
}

