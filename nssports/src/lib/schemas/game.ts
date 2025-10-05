import { z } from "zod";

export const OddsDataSchema = z.object({
  odds: z.number(),
  line: z.number().nullable().optional(),
  lastUpdated: z.coerce.date(),
});

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  logo: z.string(),
  record: z.string().optional().nullable(),
});

const SpreadSchema = z.object({
  home: OddsDataSchema,
  away: OddsDataSchema,
});

const MoneylineSchema = z.object({
  home: OddsDataSchema,
  away: OddsDataSchema,
});

const TotalSchema = z.object({
  home: OddsDataSchema,
  away: OddsDataSchema,
  over: OddsDataSchema.optional(),
  under: OddsDataSchema.optional(),
});

export const GameOddsSchema = z.object({
  spread: SpreadSchema,
  moneyline: MoneylineSchema,
  total: TotalSchema,
});

export const GameSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  startTime: z.coerce.date(),
  status: z.enum(["upcoming", "live", "finished"]),
  odds: GameOddsSchema,
  venue: z.string().nullable().optional(),
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),
  period: z.string().nullable().optional(),
  timeRemaining: z.string().nullable().optional(),
});

export type GamePayload = z.infer<typeof GameSchema>;
