import {
  assertMethod,
  body,
  env,
  limit,
  owned,
  result,
  serve,
  user,
} from "../_shared/core.ts";
import { deliver, encrypt, webhookUrl } from "../_shared/webhook.ts";
import { z } from "zod";
import { AppError } from "../_shared/policy.ts";
serve(async (req, db) => {
  assertMethod(req, ["GET", "POST", "PUT", "DELETE"]);
  const url = new URL(req.url);
  // Dedicated scheduler credential, never the service-role key.
  if (
    req.method === "POST" && url.searchParams.get("action") === "dispatch" &&
    req.headers.get("authorization") ===
      `Bearer ${env("WEBHOOK_SIGNING_SECRET")}`
  ) return { processed: await deliver(db) };
  const u = await user(req, db);
  await limit(db, `webhooks:${u.id}`, 30);
  const botId = z.string().uuid().parse(url.searchParams.get("bot"));
  await owned(db, botId, u.id);
  if (req.method === "GET") {
    const webhook = await result<any>(
      db.from("bot_webhooks").select("id,url,enabled,updated_at").eq(
        "bot_id",
        botId,
      ).maybeSingle(),
    );
    return {
      webhook,
      deliveries: webhook
        ? await result(
          db.from("webhook_deliveries").select("*").eq("webhook_id", webhook.id)
            .order("created_at", { ascending: false }).limit(50),
        )
        : [],
    };
  }
  if (req.method === "DELETE") {
    await result(
      db.from("bot_webhooks").update({ enabled: false }).eq("bot_id", botId),
    );
    return { message: "Webhook disabled." };
  }
  if (req.method === "POST" && url.searchParams.get("action") === "retry") {
    return { processed: await deliver(db, botId) };
  }
  const data = z.object({
    url: z.string().url().max(2000),
    secret: z.string().min(16).max(256).optional(),
    enabled: z.boolean(),
  }).parse(await body(req));
  webhookUrl(data.url);
  const existing = await result<any>(
    db.from("bot_webhooks").select("id,secret_encrypted").eq("bot_id", botId)
      .maybeSingle(),
  );
  if (!existing && !data.secret) {
    throw new AppError("VALIDATION_ERROR", "Webhook secret required");
  }
  await result(
    db.from("bot_webhooks").upsert({
      bot_id: botId,
      url: data.url,
      enabled: data.enabled,
      secret_encrypted: data.secret
        ? await encrypt(data.secret)
        : existing.secret_encrypted,
    }, { onConflict: "bot_id" }),
  );
  return { message: "Webhook saved." };
});
