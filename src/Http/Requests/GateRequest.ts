import { z } from "zod";

const name = z.string().trim().min(1, "Nama gate wajib diisi").max(100);

export const StoreGateRequest = z.object({ name });

export const UpdateGateRequest = z
  .object({ name, isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

export const SetOfficersRequest = z.object({
  userIds: z.array(z.number().int().positive()).max(200).transform((ids) => [...new Set(ids)]),
});
