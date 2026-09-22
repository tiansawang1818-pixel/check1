import {
  assertMethod,
  body,
  env,
  hmac,
  ipKey,
  limit,
  result,
  serve,
  settings,
} from "../_shared/core.ts";
import { AppError, checkBot, checkKey } from "../_shared/policy.ts";
import { execute } from "../_shared/execution.ts";
import { z } from "zod";
serve(async (req, db, requestId) => {
  assertMethod(req, ["POST"]);
  await limit(db, `api-edge:${await ipKey(req)}`, 120);
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "") ||
    "";
  if (!/^wbot_live_[a-f0-9]{64}$/.test(token)) {
    throw new AppError("INVALID_API_KEY", "Invalid API key.", 401);
  }
  const key = await result<any>(
    db.from("api_keys").select("*").eq(
      "key_hash",
      await hmac(env("API_KEY_HASH_SECRET"), token),
    ).is("deleted_at", null).maybeSingle(),
  );
  if (!key) throw new AppError("INVALID_API_KEY", "Invalid API key.", 401);
  if (key.revoked_at) {
    throw new AppError("API_KEY_REVOKED", "API key revoked.", 401);
  }
  const data = z.object({
    bot: z.string().min(1).max(140),
    input: z.unknown().optional(),
    action: z.enum(["run", "read", "executions"]).default("run"),
  }).parse(await body(req));
  const column = z.string().uuid().safeParse(data.bot).success
    ? "id"
    : "public_slug";
  const bot = await result<any>(
    db.from("bots").select("*").eq(column, data.bot).is("deleted_at", null)
      .maybeSingle(),
  );
  if (!bot) throw new AppError("BOT_NOT_FOUND", "Bot not found.", 404);
  checkKey(
    key,
    bot,
    data.action === "run"
      ? "bot:run"
      : data.action === "read"
      ? "bot:read"
      : "execution:read",
  );
  checkBot(bot);
  const s = await settings(db);
  if (!bot.allow_api_access || !s.allow_api_access) {
    throw new AppError("API_DISABLED", "API access disabled.", 403);
  }
  const owner = await result<any>(
    db.from("profiles").select("status").eq("id", bot.user_id).single(),
  );
  if (owner.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Owner suspended.", 403);
  }
  if (data.action !== "run") {
    await limit(db, `api:${key.id}`, s.api_rate_limit);
    await result(db.rpc("record_key_use", { p_key: key.id }));
    if (data.action === "executions") {
      return {
        data: await result(
          db.from("executions").select("*").eq("bot_id", bot.id).order(
            "created_at",
            { ascending: false },
          ).limit(50),
        ),
      };
    }
    const deployment = await result<any>(
      db.from("bot_deployments").select(
        "version,input_schema_snapshot,output_schema_snapshot",
      ).eq("bot_id", bot.id).eq("active", true).single(),
    );
    return { data: { id: bot.id, name: bot.name, ...deployment } };
  }
  const output = await execute(
    db,
    bot,
    data.input,
    "API",
    requestId,
    `api:${key.id}`,
    Math.min(s.api_rate_limit, bot.rate_limit),
    key.user_id,
    key.id,
  );
  return {
    data: output.output,
    execution: {
      executionTimeMs: output.executionTimeMs,
      requestId,
      memoryUsed: output.memoryUsed,
      version: output.version,
    },
  };
});
