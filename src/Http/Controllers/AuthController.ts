"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error?: string };

// Server action untuk form login.
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (err) {
    // Pesan sama untuk email salah, password salah, maupun akun nonaktif.
    if (err instanceof AuthError && (err as AuthError & { code?: string }).code === "rate_limited") {
      return { error: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit." };
    }
    if (err instanceof AuthError) return { error: "Email atau password salah, atau akun nonaktif" };
    throw err; // redirect sukses dilempar sebagai NEXT_REDIRECT
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
