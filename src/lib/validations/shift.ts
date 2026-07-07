// ── Shift validation schemas ────────────────────────────
import { z } from "zod";

export const startShiftSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const endShiftSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type StartShiftInput = z.infer<typeof startShiftSchema>;
export type EndShiftInput = z.infer<typeof endShiftSchema>;
