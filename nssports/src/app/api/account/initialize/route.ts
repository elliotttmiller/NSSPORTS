import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/authHelpers";

/**
 * Initialize account for authenticated user
 * Creates account with starting balance if it doesn't exist
 */
export async function POST() {
	return withErrorHandling(async () => {
		const userId = await getAuthUser();

		// Create account if it doesn't exist
		const account = await prisma.account.upsert({
			where: { userId },
			update: {}, // Don't update if exists
			create: {
				userId,
				balance: 1000.00, // Starting balance for new accounts
			},
		});

		return successResponse({
			userId: account.userId,
			balance: Number(account.balance),
			message: "Account initialized successfully"
		});
	});
}
