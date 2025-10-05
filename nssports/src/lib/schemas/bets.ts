import { z } from "zod";

// ----------------------------
// Request schemas (client/server)
// ----------------------------
export const BetSelectionSchema = z.enum(["home", "away", "over", "under"]);
export const BetTypeSchema = z.enum(["spread", "moneyline", "total", "parlay"]);

export const ParlayLegRequestSchema = z.object({
  gameId: z.string().optional(),
  betType: z.string().optional(),
  selection: z.string(),
  odds: z.number(),
  line: z.number().nullable().optional(),
});

export const BetBaseRequestSchema = z.object({
  betType: BetTypeSchema,
  stake: z.number().positive().max(1_000_000),
  potentialPayout: z.number().positive().max(100_000_000),
  status: z.enum(["pending", "won", "lost"]).optional(),
  userId: z.string().optional(),
  odds: z.number().optional(),
  line: z.number().nullable().optional(),
});

export const SingleBetRequestSchema = BetBaseRequestSchema.extend({
  betType: z.enum(["spread", "moneyline", "total"]),
  gameId: z.string(),
  selection: BetSelectionSchema,
  odds: z.number(),
});

export const ParlayBetRequestSchema = BetBaseRequestSchema.extend({
  betType: z.literal("parlay"),
  legs: z.array(ParlayLegRequestSchema).min(2),
  odds: z.number().optional(),
});

export const BetRequestSchema = z.union([
  SingleBetRequestSchema,
  ParlayBetRequestSchema,
]);

export const SingleBetResponseSchema = z.object({
  id: z.string(),
  betType: z.literal("spread").or(z.literal("moneyline")).or(z.literal("total")),
  selection: z.enum(["home", "away", "over", "under"]),
  odds: z.number(),
  line: z.number().nullable().optional(),
  stake: z.number(),
  potentialPayout: z.number(),
  status: z.enum(["pending", "won", "lost"]),
  placedAt: z.string().or(z.date()).optional(),
  settledAt: z.string().or(z.date()).nullable().optional(),
  game: z.any().optional(),
  displaySelection: z.string().optional(),
});

export const ParlayLegSchema = z.object({
  game: z.any().optional(),
  betType: z.string().optional(),
  selection: z.string(),
  odds: z.number(),
  line: z.number().optional(),
  displaySelection: z.string().optional(),
});

export const ParlayBetResponseSchema = z.object({
  id: z.string(),
  betType: z.literal("parlay"),
  stake: z.number(),
  potentialPayout: z.number(),
  status: z.enum(["pending", "won", "lost"]),
  placedAt: z.string().or(z.date()).optional(),
  legs: z.array(ParlayLegSchema).nullable(),
});

export const BetsResponseSchema = z.array(
  z.union([SingleBetResponseSchema, ParlayBetResponseSchema])
);
