// Game helpers disabled for static export
import type { Game } from "@/types";

export async function ensureGameExists(_game: Game): Promise<string> {
  return _game.id || '';
}

export async function ensureTeamExists(_team: unknown): Promise<string> {
  return '';
}

export async function ensureLeagueExists(_leagueId: string): Promise<void> {}
