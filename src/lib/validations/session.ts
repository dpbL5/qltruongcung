// ── Session validation schemas ─────────────────────────
import { z } from "zod";

export const createSessionSchema = z.object({
  customerId: z.string().uuid("ID khách hàng không hợp lệ").optional(),
  pricingRuleId: z.string().uuid("ID bảng giá không hợp lệ").optional(),
  playerCount: z.number().int().min(1, "Số người chơi tối thiểu là 1").max(50, "Số người chơi tối đa là 50").default(1),
});

export const checkoutSessionSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]),
  promotionRuleId: z.string().uuid("ID khuyến mại không hợp lệ").nullable().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid("ID sản phẩm không hợp lệ"),
    quantity: z.number().int().positive("Số lượng phải lớn hơn 0"),
  })).default([]),
  playerCount: z.number().int().min(1, "Số người checkout tối thiểu là 1").optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
