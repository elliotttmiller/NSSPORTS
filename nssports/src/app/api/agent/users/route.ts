import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse, ApiErrors } from "@/lib/apiResponse";
import { auth } from "@/lib/auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Get all users (players) for the authenticated agent with their account balances
 */
export async function GET() {
  return withErrorHandling(async () => {
    // Get the authenticated session
    const session = await auth();
    
    if (!session?.user) {
      throw ApiErrors.unauthorized('Authentication required');
    }

    // Check if user is an agent or admin
    if (!session.user.isAgent && !session.user.isAdmin) {
      throw ApiErrors.forbidden('Access denied. Agent or admin role required');
    }

    const agentId = session.user.id;

    try {
      // Fetch all users (players) registered by this agent with their account information
      const users = await prisma.user.findMany({
        where: {
          parentAgentId: agentId,
          userType: 'player',
          isActive: true,
        },
        include: {
          account: {
            select: {
              balance: true,
              updatedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform the data for the frontend
      const usersWithBalances = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.account ? Number(user.account.balance) : 0,
        lastBalanceUpdate: user.account?.updatedAt,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
      }));

      // Calculate summary statistics
      const totalUsers = usersWithBalances.length;
      const totalBalance = usersWithBalances.reduce((sum, user) => sum + user.balance, 0);
      const activeUsers = usersWithBalances.filter(user => {
        // Consider user active if they logged in within the last 7 days
        if (!user.lastLogin) return false;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return user.lastLogin > sevenDaysAgo;
      }).length;

      return successResponse({
        users: usersWithBalances,
        summary: {
          totalUsers,
          totalBalance,
          activeUsers,
        },
      });
    } catch (error) {
      console.error('[API /agent/users] Error fetching agent users:', error);
      throw ApiErrors.internal('Failed to fetch users');
    }
  });
}