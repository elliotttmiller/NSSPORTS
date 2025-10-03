import { Prisma } from '@prisma/client';

// Prisma types with all relations
export type GameWithRelations = Prisma.GameGetPayload<{
  include: {
    homeTeam: true;
    awayTeam: true;
    odds: true;
  };
}>;

export type OddsRecord = Prisma.OddsGetPayload<{
  select: {
    id: true;
    gameId: true;
    betType: true;
    selection: true;
    odds: true;
    line: true;
    lastUpdated: true;
  };
}>;

export type TeamRecord = Prisma.TeamGetPayload<{
  select: {
    id: true;
    name: true;
    shortName: true;
    logo: true;
    record: true;
  };
}>;

export interface OddsMap {
  [betType: string]: {
    [selection: string]: {
      odds: number;
      line?: number | null;
      lastUpdated: Date;
    };
  };
}
