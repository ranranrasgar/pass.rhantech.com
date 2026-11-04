import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);

export const REPORT_TABS = ["all", "absent", "gates", "rejected"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

/** Filter laporan (query string). Nilai tidak valid diabaikan, bukan galat. */
export const ReportQuery = z.object({
  tab: z.enum(REPORT_TABS).catch("all"),
  group: z.string().trim().max(100).optional().catch(undefined),
  gate: z.coerce.number().int().positive().optional().catch(undefined),
  status: z.enum(["present", "absent"]).optional().catch(undefined),
  from: ymd,
  to: ymd,
  page: z.coerce.number().int().min(1).catch(1),
});
export type ReportFilter = z.infer<typeof ReportQuery>;

export const ExportQuery = ReportQuery.extend({ format: z.enum(["xlsx", "csv"]).catch("xlsx") });

export const CancelCheckInRequest = z.object({
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(500),
});

export const AuditQuery = z.object({
  user: z.coerce.number().int().positive().optional().catch(undefined),
  action: z.string().trim().max(100).optional().catch(undefined),
  from: ymd,
  to: ymd,
  page: z.coerce.number().int().min(1).catch(1),
});
