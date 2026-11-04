import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { LoginRequest } from "@/Http/Requests/AuthRequest";
import { User } from "@/Models/User";
import { verifyPassword } from "@/lib/password";
import { loginLimiter } from "@/lib/rateLimit";

/** Dilempar saat terlalu banyak percobaan gagal; `code` dibaca AuthController. */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const input = LoginRequest.safeParse(raw);
        if (!input.success) return null;
        // Kunci = email + IP (bila ada proxy yang mengirim x-forwarded-for). Di LAN tanpa proxy
        // praktis per email: mencegah tebak password, risiko kecil akun terkunci 15 menit.
        const ip = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
        const key = `${input.data.email}|${ip}`;
        if (loginLimiter.blockedFor(key) > 0) throw new TooManyAttempts();
        const user = await User.findForLogin(input.data.email);
        // User nonaktif tidak bisa login.
        const ok = !!user && user.isActive && (await verifyPassword(input.data.password, user.passwordHash));
        if (!ok || !user) {
          loginLimiter.fail(key);
          return null;
        }
        loginLimiter.reset(key);
        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
