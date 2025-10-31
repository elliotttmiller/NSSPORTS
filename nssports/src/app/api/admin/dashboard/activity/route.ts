import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Mock data for now - will be replaced with Prisma after regeneration
    const activities = [
      {
        id: "1",
        time: "12:45",
        type: "agent",
        message: 'Agent "john_smith" registered player "mike_2024"',
        icon: "user",
      },
      {
        id: "2",
        time: "12:32",
        type: "player",
        message: 'Player "sara_bets" placed $250 bet on NBA',
        icon: "bet",
      },
      {
        id: "3",
        time: "12:28",
        type: "agent",
        message: 'Agent "lisa_ops" adjusted balance +$500 for "tom_player"',
        icon: "dollar",
      },
      {
        id: "4",
        time: "12:15",
        type: "system",
        message: "System: Daily backup completed successfully",
        icon: "check",
      },
      {
        id: "5",
        time: "12:03",
        type: "bet",
        message: 'Player "david88" won $1,200 on Football',
        icon: "trophy",
      },
      {
        id: "6",
        time: "11:54",
        type: "agent",
        message: 'Agent "mark_t" suspended player "problem_gambler"',
        icon: "ban",
      },
    ];

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
