// Bentuk respons POST /api/imports/preview (lihat ImportController.preview).
import type { ColumnMapping, ImportRow, ImportSummary } from "@/Services/Import/validateImport";

export type { ColumnMapping, ImportRow, ImportSummary };

export type PreviewData = {
  fileName: string;
  sheets: string[];
  sheet: string;
  headerRow: number;
  headers: string[];
  mapping: ColumnMapping;
  missing: string[];
  summary: ImportSummary;
  event: { id: number; name: string };
  problems: ImportRow[];
  sample: ImportRow[];
};

export type BatchItem = {
  id: number;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdLabel: string;
  userName: string;
};
