import { requestJson } from "./transport";
import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const supabase = configured
  ? createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  : null;
export const appUrl = (import.meta.env.VITE_APP_URL || location.origin).replace(
  /\/$/,
  "",
);
export const apiUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1`;
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
  extraHeaders?: Record<string, string>,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  if (!supabase) {
    throw new Error("กรุณาตั้งค่า Supabase ก่อนใช้งานระบบ");
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error("ไม่สามารถตรวจสอบบัญชีได้ กรุณาเข้าสู่ระบบอีกครั้ง");
  return requestJson<T>(`${apiUrl}/${path}`, {
    method,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...extraHeaders,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  }, options);
}
