// ── Customer validation schemas ────────────────────────
import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống").max(100),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  type: z.enum(["WALK_IN", "STUDENT", "MEMBER"]).default("WALK_IN"),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export const upgradeMemberSchema = z.object({
  memberCode: z.string().max(20).optional(),
  memberTierId: z.string().uuid(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
