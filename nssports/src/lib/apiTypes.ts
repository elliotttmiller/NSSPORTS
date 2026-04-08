// Prisma types disabled for static export - using generic types

type TeamRelation = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  record?: string | null;
};

type OddsRelation = {
  betType: string;
  selection?: string | null;
  odds: number;
  line?: number | null;
  lastUpdated: Date;
};

export type GameWithRelations = {
  id: string;
  leagueId: string;
  homeTeam: TeamRelation;
  awayTeam: TeamRelation;
  startTime: Date;
  status: string;
  venue?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  period?: string | null;
  timeRemaining?: string | null;
  odds: OddsRelation[];
};

export type OddsRecord = Record<string, unknown>;
export type OddsMap = Record<string, Record<string, unknown>>;
export type TeamRecord = Record<string, unknown>;
export type BetWithRelations = Record<string, unknown>;
export type UserWithAccount = Record<string, unknown>;
export type PlayerPropWithRelations = Record<string, unknown>;
export type GamePropWithRelations = Record<string, unknown>;
