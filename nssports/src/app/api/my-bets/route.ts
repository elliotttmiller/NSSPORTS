import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Minimal leg shape stored in Bet.legs JSON
type ParlayLeg = {
  gameId?: string;
  betType?: string;
  selection?: string;
  odds?: number;
  line?: number | null;
};

function toLegArray(input: unknown): ParlayLeg[] | null {
  try {
    const value =
      typeof input === "string" ? (JSON.parse(input) as unknown) : input;
    if (!Array.isArray(value)) return null;
    return value
      .map((item) => (typeof item === "object" && item !== null ? item : null))
      .filter((x): x is Record<string, unknown> => x !== null)
      .map((obj) => ({
        gameId: typeof obj.gameId === "string" ? obj.gameId : undefined,
        betType: typeof obj.betType === "string" ? obj.betType : undefined,
        selection:
          typeof obj.selection === "string" ? obj.selection : undefined,
        odds:
          typeof obj.odds === "number"
            ? obj.odds
            : typeof obj.odds === "string"
            ? Number(obj.odds)
            : undefined,
        line:
          typeof obj.line === "number"
            ? obj.line
            : typeof obj.line === "string"
            ? Number(obj.line)
            : null,
      }));
  } catch {
    return null;
  }
}

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all bets (for demo, fetch all; in production, filter by user)
    const bets = await prisma.bet.findMany({
      orderBy: { placedAt: "desc" },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
            league: true,
          },
        },
      },
    });
    // Normalize legs for parlay bets and enrich leg.game when possible
    const allLegGameIds: Set<string> = new Set();
    for (const bet of bets) {
      if (bet.betType === "parlay" && bet.legs) {
        const legs = toLegArray(bet.legs);
        if (Array.isArray(legs)) {
          for (const leg of legs) {
            if (leg?.gameId) allLegGameIds.add(leg.gameId);
          }
        }
      }
    }

    let legGamesById: Record<string, unknown> = {};
    if (allLegGameIds.size > 0) {
      const games = await prisma.game.findMany({
        where: { id: { in: Array.from(allLegGameIds) } },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });
      legGamesById = Object.fromEntries(
        games.map((g) => [g.id, JSON.parse(JSON.stringify(g))])
      );
    }

    const normalized = bets.map((bet) => {
      if (bet.betType !== "parlay") return bet;
      const legsRaw = toLegArray(bet.legs);
      const legs = Array.isArray(legsRaw)
        ? legsRaw.map((leg) => ({
            ...leg,
            game: leg?.gameId
              ? (legGamesById[leg.gameId] as unknown) ?? undefined
              : undefined,
          }))
        : null;
      return { ...bet, legs };
    });

    // Convert Decimal fields to numbers for client consumption
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      // Prisma Decimal
      if (v && typeof v === "object" && "toNumber" in (v as Record<string, unknown>)) {
        try { return (v as unknown as { toNumber: () => number }).toNumber(); } catch { /* noop */ }
      }
      if (typeof v === "string") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
      return 0;
    };
    const serialized = normalized.map((b) => ({
      ...(b as Record<string, unknown>),
      stake: toNum((b as Record<string, unknown>).stake),
      potentialPayout: toNum((b as Record<string, unknown>).potentialPayout),
    }));
    return NextResponse.json(JSON.parse(JSON.stringify(serialized)));
  } catch {
    return NextResponse.json({ error: "Failed to fetch bet history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
  // const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
    const body = await req.json();

    const legSchema = z.object({
      gameId: z.string().optional(),
      betType: z.string().optional(),
      selection: z.string(),
      odds: z.number(),
      line: z.number().nullable().optional(),
    });

    const baseSchema = z.object({
      betType: z.enum(["spread", "moneyline", "total", "parlay"]),
      stake: z.number().positive().max(1000000),
      potentialPayout: z.number().positive().max(100000000),
      status: z.enum(["pending", "won", "lost"]).optional(),
      userId: z.string().optional(),
      odds: z.number().optional(),
      line: z.number().nullable().optional(),
    });

    const singleSchema = baseSchema.extend({
      betType: z.enum(["spread", "moneyline", "total"]),
      gameId: z.string(),
      selection: z.enum(["home", "away", "over", "under"]),
      odds: z.number(),
    });

    const parlaySchema = baseSchema.extend({
      betType: z.literal("parlay"),
      legs: z.array(legSchema).min(2),
      odds: z.number().optional(),
    });

    const isParlay = body?.betType === "parlay";
    const data = isParlay ? parlaySchema.parse(body) : singleSchema.parse(body);

  // NOTE: Idempotency storage requires a DB migration and prisma generate.
  // After running migrations, re-enable lookup by idempotencyKey to prevent duplicates.

    // For parlay, store as a single bet with betType 'parlay', odds, stake, payout, and selection 'parlay'.
  if (data.betType === "parlay") {
      const parlayBet = await prisma.bet.create({
        data: {
          betType: "parlay",
          stake: data.stake,
          potentialPayout: data.potentialPayout,
          status: data.status || "pending",
          placedAt: new Date(),
          userId: data.userId ?? null,
          selection: "parlay",
          odds: data.odds ?? 0,
          line: null,
          gameId: null,
          // Store legs as JSON array directly so clients can consume without parsing strings
          legs: data.legs ?? null,
        },
      });
    return NextResponse.json(JSON.parse(JSON.stringify(parlayBet)), { status: 201 });
    }
    // Single bet
    if (!data.gameId || !data.selection || !data.odds) {
      return NextResponse.json({ error: "Missing required single bet fields" }, { status: 400 });
    }
    const bet = await prisma.bet.create({
      data: {
        gameId: data.gameId,
        betType: data.betType,
        selection: data.selection,
        odds: data.odds,
        line: data.line ?? null,
        stake: data.stake,
        potentialPayout: data.potentialPayout ?? 0,
        status: data.status || "pending",
        placedAt: new Date(),
        userId: data.userId ?? null,
      },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
            league: true,
          },
        },
      },
    });
    return NextResponse.json(JSON.parse(JSON.stringify(bet)), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 });
  }
}
