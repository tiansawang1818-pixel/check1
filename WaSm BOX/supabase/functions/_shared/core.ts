import { createClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";
import { AppError, checkOwner } from "./policy.ts";
export function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      `Missing server configuration: ${name}`,
      503,
    );
  }
  if (
    ["API_KEY_HASH_SECRET", "WEBHOOK_SIGNING_SECRET"].includes(name) &&
    v.length < 32
  ) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      `${name} must contain at least 32 characters.`,
      503,
    );
  }
  return v;
}
export function database() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export type DB = ReturnType<typeof database>;
export async function result<T = any>(
  query: PromiseLike<{ data: T | null; error: any }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error("database operation failed", { code: error.code });
    const message = String(error.message || "");
    if (message.includes("BOT_DISABLED")) {
      throw new AppError(
        "BOT_DISABLED",
        "Bot access changed during the request.",
        403,
      );
    }
    if (message.includes("FORBIDDEN")) {
      throw new AppError("FORBIDDEN", "Permission denied.", 403);
    }
    if (message.includes("Reason required")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "A reason of at least 3 characters is required.",
      );
    }
    if (message.includes("own administrative")) {
      throw new AppError(
        "FORBIDDEN",
        "You cannot change your own administrative access.",
        403,
      );
    }
    if (message.includes("API_KEY_REVOKED")) {
      throw new AppError(
        "API_KEY_REVOKED",
        "API key was revoked during the request.",
        401,
      );
    }
    throw new AppError(
      message.includes("LIMIT") ? "LIMIT_REACHED" : "DATABASE_ERROR",
      message.includes("LIMIT")
        ? "Account resource limit reached."
        : "Database operation failed.",
      message.includes("LIMIT") ? 409 : 500,
    );
  }
  return data as T;
}
export async function settings(db: DB) {
  const rows = await result<any[]>(
    db.from("system_settings").select("key,value"),
  );
  return Object.fromEntries(rows.map((x) => [x.key, x.value]));
}
export async function user(req: Request, db: DB, admin = false) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token || token.startsWith("wbot_")) {
    throw new AppError("UNAUTHORIZED", "Please sign in.", 401);
  }
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError("UNAUTHORIZED", "Session is invalid or expired.", 401);
  }
  const profile = await result<any>(
    db.from("profiles").select("*").eq("id", data.user.id).single(),
  );
  if (profile.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Account suspended.", 403);
  }
  if (admin && profile.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Administrator access required.", 403);
  }
  // Throttle last-active writes to one per minute.
  if (
    !profile.last_active_at ||
    Date.parse(profile.last_active_at) < Date.now() - 60000
  ) {
    await result(
      db.from("profiles").update({ last_active_at: new Date().toISOString() })
        .eq("id", profile.id),
    );
  }
  return profile;
}
export async function owned(db: DB, id: string, userId: string) {
  z.string().uuid().parse(id);
  const b = await result<any>(
    db.from("bots").select("*").eq("id", id).is("deleted_at", null)
      .maybeSingle(),
  );
  if (!b) throw new AppError("BOT_NOT_FOUND", "Bot not found.", 404);
  checkOwner(b, userId);
  return b;
}
export async function limit(db: DB, key: string, max: number) {
  const allowed = await result(
    db.rpc("consume_limit", { p_key: key, p_limit: max }),
  );
  if (!allowed) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Retry in one minute.",
      429,
    );
  }
}
export async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
    ),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
}
export function ipKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  return hmac(
    env("API_KEY_HASH_SECRET"),
    `${new Date().toISOString().slice(0, 10)}:${ip}`,
  );
}
export function assertMethod(req: Request, methods: string[]) {
  if (!methods.includes(req.method)) {
    throw new AppError("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 65536) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Request exceeds 64 KiB.", 413);
  }
  if (!req.body) throw new AppError("VALIDATION_ERROR", "JSON body required.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new AppError("PAYLOAD_TOO_LARGE", "Request exceeds 64 KiB.", 413);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(merged));
    const stack: { value: unknown; depth: number }[] = [{
      value: parsed,
      depth: 0,
    }];
    let nodes = 0;
    while (stack.length) {
      const { value, depth } = stack.pop()!;
      if (++nodes > 10000 || depth > 32) {
        throw new AppError(
          "VALIDATION_ERROR",
          "JSON structure exceeds its complexity limit.",
        );
      }
      if (value && typeof value === "object") {
        for (const child of Object.values(value)) {
          stack.push({ value: child, depth: depth + 1 });
        }
      }
    }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new AppError("VALIDATION_ERROR", "Body must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("VALIDATION_ERROR", "Invalid JSON.");
  }
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-embed-origin",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function serve(
  handler: (req: Request, db: DB, requestId: string) => Promise<unknown>,
) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    const requestId = crypto.randomUUID();
    try {
      const data = await handler(req, database(), requestId);
      return Response.json({ success: true, ...data as object }, {
        headers: cors,
      });
    } catch (e) {
      const err = e instanceof AppError
        ? e
        : e instanceof ZodError
        ? new AppError(
          "VALIDATION_ERROR",
          e.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
        )
        : new AppError("INTERNAL_ERROR", "Unexpected server error.", 500);
      if (err.status >= 500) console.error(requestId, e);
      return Response.json({
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
      }, {
        status: err.status,
        headers: {
          ...cors,
          ...(err.status === 429 ? { "Retry-After": "60" } : {}),
        },
      });
    }
  });
}
export function page(url: URL) {
  const p = Math.max(
    0,
    Math.min(10000, Math.floor(Number(url.searchParams.get("page"))) || 0),
  );
  return [p * 50, p * 50 + 49] as const;
}
