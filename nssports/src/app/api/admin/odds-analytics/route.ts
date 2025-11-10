import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import {
  calculateKellyCriterion,
  devig,
  type KellyCriterionInput,
  type DeviggingInput,
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
