import { type DB, env, hmac, result } from "./core.ts";
import { AppError } from "./policy.ts";
export function webhookUrl(value: string) {
  const url = new URL(value);
  const hosts = (Deno.env.get("WEBHOOK_ALLOWED_HOSTS") || "").split(",").map(
    (x) => x.trim().toLowerCase(),
  ).filter(Boolean);
  if (
    url.protocol !== "https:" || url.username || url.password ||
    url.port && url.port !== "443" ||
    !hosts.includes(url.hostname.toLowerCase()) ||
    url.hostname === "localhost" || /^[\d.]+$/.test(url.hostname) ||
    url.hostname.includes(":")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Webhook must use HTTPS on a server-approved destination host.",
    );
  }
  return url;
}
function encryptionKey() {
  const bytes = Uint8Array.from(
    atob(env("WEBHOOK_ENCRYPTION_KEY")),
    (c) => c.charCodeAt(0),
  );
  if (bytes.length !== 32) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Webhook encryption key must be 32 bytes.",
      503,
    );
  }
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encrypt(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(secret),
  );
  return `${btoa(String.fromCharCode(...iv))}.${
    btoa(String.fromCharCode(...new Uint8Array(data)))
  }`;
}
export async function decrypt(value: string) {
  const [a, b] = value.split(".");
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Uint8Array.from(atob(a), (c) => c.charCodeAt(0)),
      },
      await encryptionKey(),
      Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
    ),
  );
}
export async function deliver(db: DB, botId: string | null = null) {
  const deliveries = await result<any[]>(
    db.rpc("claim_deliveries", { p_bot: botId }),
  );
  await Promise.all(deliveries.map(async (d) => {
    let statusCode: number | null = null;
    try {
      const w = await result<any>(
        db.from("bot_webhooks").select("*").eq("id", d.webhook_id).single(),
      );
      const b = await result<any>(
        db.from("bots").select("status,deleted_at,user_id").eq("id", w.bot_id)
          .single(),
      );
      const p = await result<any>(
        db.from("profiles").select("status").eq("id", b.user_id).single(),
      );
      if (
        !w.enabled || b.deleted_at || b.status !== "ACTIVE" ||
        p.status !== "ACTIVE"
      ) throw new Error("Delivery disabled");
      const e = await result<any>(
        db.from("executions").select("*").eq("id", d.execution_id).single(),
      );
      const payload = JSON.stringify({
        event: "bot.execution.success",
        botId: e.bot_id,
        requestId: e.request_id,
        input: e.input,
        output: e.output,
        createdAt: e.created_at,
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await hmac(
        await decrypt(w.secret_encrypted),
        `${timestamp}.${payload}`,
      );
      const response = await fetch(webhookUrl(w.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WasmBot-Signature": `t=${timestamp},v1=${signature}`,
          "X-WasmBot-Delivery": d.id,
        },
        body: payload,
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      statusCode = response.status;
      await response.body?.cancel();
      if (!response.ok) throw new Error(`HTTP ${statusCode}`);
      await result(
        db.from("webhook_deliveries").update({
          status: "SUCCESS",
          status_code: statusCode,
          error_message: null,
        }).eq("id", d.id),
      );
    } catch (e) {
      await result(
        db.from("webhook_deliveries").update({
          status: d.attempt_count >= 3 ? "FAILED" : "PENDING",
          status_code: statusCode,
          error_message: (e as Error).message.slice(0, 500),
          next_attempt_at: new Date(
            Date.now() + Math.pow(2, d.attempt_count) * 1000,
          ).toISOString(),
        }).eq("id", d.id),
      );
    }
  }));
  return deliveries.length;
}
