import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import {
  calculateKellyCriterion,
  devig,
  calculateProfitability,
  analyzeMarketEfficiency,
  calculateExpectedValue,
  calculateBreakEvenRate,
  calculateCLV,
  type KellyCriterionInput,
  type DeviggingInput,
  type ProfitabilityInput,
  type MarketEfficiencyInput,
  type CLVInput,
} from "@/lib/odds-analytics";

/**
 * POST /api/admin/odds-analytics
 * Calculate various odds analytics based on the requested operation
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { operation, data } = body;

    switch (operation) {
      case 'kelly_criterion': {
        const input = data as KellyCriterionInput;
        const result = calculateKellyCriterion(input);
        return NextResponse.json(result);
      }

      case 'devig': {
        const input = data as DeviggingInput;
        const result = devig(input);
        return NextResponse.json(result);
      }

      case 'profitability': {
        const input = data as ProfitabilityInput;
        const result = calculateProfitability(input);
        return NextResponse.json(result);
      }

      case 'market_efficiency': {
        const input = data as MarketEfficiencyInput;
        const result = analyzeMarketEfficiency(input);
        return NextResponse.json(result);
      }

      case 'expected_value': {
        const { winProbability, americanOdds, betAmount } = data;
        const result = calculateExpectedValue(winProbability, americanOdds, betAmount);
        return NextResponse.json({ expectedValue: result });
      }

      case 'break_even': {
        const { americanOdds } = data;
        const result = calculateBreakEvenRate(americanOdds);
        return NextResponse.json({ breakEvenRate: result });
      }

      case 'clv': {
        const input = data as CLVInput;
        const result = calculateCLV(input);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    );
  }
}
