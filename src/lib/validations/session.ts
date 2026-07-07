// ── Session validation schemas ─────────────────────────
import { z } from "zod";

export const createSessionSchema = z.object({
  customerId: z.string().uuid("ID khách hàng không hợp lệ").optional(),
  hourlyRate: z.number().positive("Giá theo giờ phải > 0").optional(),
});

export const checkoutSessionSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const addOrderSchema = z.object({
  serviceId: z.string().uuid("ID dịch vụ không hợp lệ"),
  quantity: z.number().int().positive("Số lượng phải > 0"),
});

export const updateSessionSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type AddOrderInput = z.infer<typeof addOrderSchema>;
