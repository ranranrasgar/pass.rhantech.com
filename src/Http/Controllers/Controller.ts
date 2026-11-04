import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { HttpError } from "@/Http/Middleware/Authenticate";

export type RouteCtx = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: RouteCtx) => Promise<Response>;

/** Bungkus handler: ubah error jadi respons JSON tanpa stack trace ke user. */
export function action(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      if (err instanceof z.ZodError) {
        return json({ error: err.issues[0]?.message ?? "Data tidak valid", fields: z.flattenError(err).fieldErrors }, 422);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return json({ error: "Data sudah ada (duplikat)" }, 409);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return json({ error: "Data tidak ditemukan" }, 404);
      }
      console.error(err);
      return json({ error: "Terjadi kesalahan pada server" }, 500);
    }
  };
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body request harus JSON");
  }
}

export async function idParam(ctx: RouteCtx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "Data tidak ditemukan");
  return id;
}
