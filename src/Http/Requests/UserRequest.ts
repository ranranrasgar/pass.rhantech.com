import { z } from "zod";
import { Role } from "@/lib/roles";

const name = z.string().trim().min(1, "Nama wajib diisi").max(150);
const email = z.string().trim().toLowerCase().pipe(z.email("Email tidak valid"));
const password = z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter");
const role = z.enum(Role, { error: "Role tidak valid" });

export const StoreUserRequest = z.object({ name, email, password, role });

export const UpdateUserRequest = z
  .object({ name, email, role, isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

export const ResetPasswordRequest = z.object({ password });
