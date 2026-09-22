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
): Promise<T> {
  if (!supabase) {
    throw new Error("Configure Supabase before using the application.");
  }
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${apiUrl}/${path}`, {
    method,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...extraHeaders,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || `Request failed (${response.status})`,
    );
  }
  return result;
}
