import { z } from "zod";

export const LoginRequest = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email tidak valid")),
  password: z.string().min(1, "Password wajib diisi"),
});
