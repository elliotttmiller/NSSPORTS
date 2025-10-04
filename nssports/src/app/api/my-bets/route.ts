import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
    return NextResponse.json(bets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bet history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Validate required fields for single bet
    if (!data || !data.gameId || !data.betType || !data.selection || !data.odds || !data.stake) {
      return NextResponse.json({ error: "Missing required bet fields" }, { status: 400 });
    }

    // Create single bet in database
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
    return NextResponse.json(bet, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 });
  }
}
