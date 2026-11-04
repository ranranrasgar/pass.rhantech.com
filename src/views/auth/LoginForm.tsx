"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login, type LoginState } from "@/Http/Controllers/AuthController";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { Alert, AlertDescription } from "@/views/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/views/components/ui/card";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Image src="/logo-rhansoft.png" alt="Logo" width={64} height={64} className="mx-auto" priority />
        <CardTitle className="text-xl">VenuePass</CardTitle>
        <CardDescription>Masuk untuk mengelola tiket & absensi</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
