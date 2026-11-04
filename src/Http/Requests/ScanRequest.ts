import { z } from "zod";
import { ScanResult } from "@/generated/prisma/enums";

export const ScanRequest = z.object({
  token: z.string().max(500, "Isi QR terlalu panjang"),
  gateId: z.coerce.number().int().positive(),
});

export const ScanLogQuery = z.object({
  result: z.enum(ScanResult).optional().catch(undefined),
  gate: z.coerce.number().int().positive().optional().catch(undefined),
  user: z.coerce.number().int().positive().optional().catch(undefined),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
