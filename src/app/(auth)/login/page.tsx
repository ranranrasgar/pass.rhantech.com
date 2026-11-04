import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/Http/Middleware/Authenticate";
import { LoginForm } from "@/views/auth/LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <LoginForm />
    </div>
  );
}
