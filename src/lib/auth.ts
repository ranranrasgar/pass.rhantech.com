import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { LoginRequest } from "@/Http/Requests/AuthRequest";
import { User } from "@/Models/User";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const input = LoginRequest.safeParse(raw);
        if (!input.success) return null;
        const user = await User.findForLogin(input.data.email);
        // User nonaktif tidak bisa login.
        if (!user || !user.isActive) return null;
        if (!(await verifyPassword(input.data.password, user.passwordHash))) return null;
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
