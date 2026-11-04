// Pemanggil API dari client component. Tidak pernah melempar: selalu kembalikan hasil.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string[] | undefined> };

export function apiSend<T = unknown>(url: string, method: string, data?: unknown): Promise<ApiResult<T>> {
  return request<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

/** Kirim multipart/form-data (unggah file). */
export function apiUpload<T = unknown>(url: string, form: FormData): Promise<ApiResult<T>> {
  return request<T>(url, { method: "POST", body: form });
}

async function request<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Gagal (${res.status})`, fields: json.fields };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, error: "Gagal terhubung ke server" };
  }
}
