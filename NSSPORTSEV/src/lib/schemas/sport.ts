import { z } from "zod";
import { GameSchema } from "./game";

export const LeagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  sportId: z.string(),
  logo: z.string().optional().nullable(),
  games: z.array(GameSchema).optional().default([]),
});

export const SportSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional().nullable(),
  leagues: z.array(LeagueSchema),
});

export type SportPayload = z.infer<typeof SportSchema>;
