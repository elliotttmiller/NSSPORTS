// Odds juice service disabled for static export
export async function getOddsJuice(): Promise<unknown> { return null; }
export async function calculateJuice(): Promise<number> { return 0; }
export const OddsJuiceService = null;
export const oddsJuiceService = {
  applyJuice: async (_params: {
    bookOdds: number;
    marketType: string;
    league: string;
    isLive: boolean;
  }): Promise<{ adjustedOdds: number }> => ({ adjustedOdds: _params.bookOdds }),
};
