import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/adminAuth";
import { oddsJuiceService } from "@/lib/odds-juice-service";

/**
 * GET /api/admin/odds-config
 * Fetch current odds juice configuration
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.oddsConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { lastModified: 'desc' },
    });

    if (!config) {
      // Return defaults if no config exists
      return NextResponse.json({
        spreadMargin: 0.045,
        moneylineMargin: 0.05,
        totalMargin: 0.045,
        playerPropsMargin: 0.08,
        gamePropsMargin: 0.08,
        roundingMethod: 'nearest10',
        liveGameMultiplier: 1.0,
        minOdds: -10000,
        maxOdds: 10000,
        isActive: false,
        leagueOverrides: null,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching odds config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/odds-config
 * Update odds juice configuration
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      spreadMargin,
      moneylineMargin,
      totalMargin,
      playerPropsMargin,
      gamePropsMargin,
      roundingMethod,
      liveGameMultiplier,
      minOdds,
      maxOdds,
      isActive,
      leagueOverrides,
    } = body;

    // Fetch current config for history
    const currentConfig = await prisma.oddsConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { lastModified: 'desc' },
    });

    // Deactivate all existing configs
    await prisma.oddsConfiguration.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    const newConfig = await prisma.oddsConfiguration.create({
      data: {
        spreadMargin,
        moneylineMargin,
        totalMargin,
        playerPropsMargin,
        gamePropsMargin,
        roundingMethod,
        liveGameMultiplier,
        minOdds,
        maxOdds,
        isActive,
        leagueOverrides: leagueOverrides || null,
        modifiedBy: admin.id,
      },
    });

    // Log the change in history
    if (currentConfig) {
      await prisma.oddsConfigHistory.create({
        data: {
          configId: newConfig.id,
          adminUserId: admin.id,
          changedFields: {
            spreadMargin: currentConfig.spreadMargin !== spreadMargin,
            moneylineMargin: currentConfig.moneylineMargin !== moneylineMargin,
            totalMargin: currentConfig.totalMargin !== totalMargin,
            playerPropsMargin: currentConfig.playerPropsMargin !== playerPropsMargin,
            gamePropsMargin: currentConfig.gamePropsMargin !== gamePropsMargin,
            liveGameMultiplier: currentConfig.liveGameMultiplier !== liveGameMultiplier,
          },
          previousValues: {
            spreadMargin: currentConfig.spreadMargin,
            moneylineMargin: currentConfig.moneylineMargin,
            totalMargin: currentConfig.totalMargin,
          },
          newValues: {
            spreadMargin,
            moneylineMargin,
            totalMargin,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      });
    }

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.id,
        action: 'ODDS_CONFIG_UPDATE',
        resource: 'OddsConfiguration',
        resourceId: newConfig.id,
        details: {
          margins: { spreadMargin, moneylineMargin, totalMargin },
          isActive,
        },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // Invalidate juice service cache
    oddsJuiceService.invalidateCache();

    return NextResponse.json({
      success: true,
      config: newConfig,
      message: 'Odds configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating odds config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
