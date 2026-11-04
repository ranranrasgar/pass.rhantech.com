// Cek optimistis saja (ada sesi / tidak). Otorisasi sebenarnya di server:
// requirePageUser / requireUser di setiap halaman & controller.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  // /login tidak dialihkan di sini: user nonaktif masih punya JWT, jadi
  // halaman login sendiri yang memeriksa DB (hindari loop /login <-> /dashboard).
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // Lewati API (cek sendiri, balas 401 JSON), aset Next, dan file statis (sw.js, ikon, manifest).
  matcher: ["/((?!api|_next/static|_next/image|.*\..*).*)"],
};
