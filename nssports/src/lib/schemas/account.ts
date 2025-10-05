import { z } from "zod";

export const AccountSchema = z.object({
  userId: z.string(),
  balance: z.number().finite().nonnegative(),
  available: z.number().finite().nonnegative(),
  risk: z.number().finite().min(0),
});

export type AccountPayload = z.infer<typeof AccountSchema>;
