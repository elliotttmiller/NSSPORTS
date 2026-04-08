// Hybrid cache disabled for static export
export async function getHybridGames(_leagueId?: string): Promise<unknown[]> { return []; }
export async function getHybridLiveGames(): Promise<unknown[]> { return []; }
export async function getHybridPlayerProps(_eventId: string): Promise<unknown[]> { return []; }
export async function getHybridGameProps(_eventId: string): Promise<unknown[]> { return []; }
