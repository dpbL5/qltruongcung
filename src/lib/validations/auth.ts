// ── Auth validation schemas ─────────────────────────────
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập ít nhất 3 ký tự"),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  fullName: z.string().min(1, "Họ tên không được để trống").max(100),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6).max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
