import { AppError, checkBot } from "./policy.ts";
import { BotSchema, validateInput } from "./schema.ts";
import { type DB, limit, result } from "./core.ts";
import { runWasm } from "./wasm.ts";
import { deliver } from "./webhook.ts";
export async function execute(
  db: DB,
  bot: any,
  input: unknown,
  source: string,
  requestId: string,
  rateKey: string,
  max: number,
  userId?: string,
  keyId?: string,
) {
  let deployment: any = null;
  let execution: any = {
    bot_id: bot.id,
    request_id: requestId,
    user_id: userId || null,
    api_key_id: keyId || null,
    source,
    input: input ?? null,
    execution_time_ms: 0,
  };
  let value: any;
  try {
    checkBot(bot, source !== "DASHBOARD");
    const owner = await result<any>(
      db.from("profiles").select("status").eq("id", bot.user_id).single(),
    );
    if (owner.status !== "ACTIVE") {
      throw new AppError("BOT_DISABLED", "Bot owner is suspended.", 403);
    }
    await limit(db, rateKey, max);
    if (source !== "DASHBOARD") {
      deployment = await result<any>(
        db.from("bot_deployments").select("*").eq("bot_id", bot.id).eq(
          "active",
          true,
        ).single(),
      );
      if (!deployment) {
        throw new AppError("BOT_NOT_PUBLISHED", "No active deployment.", 403);
      }
    }
    const draft = BotSchema.parse({
      name: bot.name,
      description: bot.description,
      category: bot.category,
      input_schema: deployment?.input_schema_snapshot ?? bot.input_schema,
      output_schema: deployment?.output_schema_snapshot ?? bot.output_schema,
      rule_definition: deployment?.rule_snapshot ?? bot.rule_definition,
      allow_public_access: bot.allow_public_access,
      allow_api_access: bot.allow_api_access,
      allow_embed: bot.allow_embed,
      allowed_domains: bot.allowed_domains,
      rate_limit: bot.rate_limit,
      widget: bot.widget,
    });
    try {
      validateInput(draft.input_schema, input);
    } catch (e) {
      throw new AppError("VALIDATION_ERROR", (e as Error).message);
    }
    value = await runWasm(draft.rule_definition, input, draft.input_schema);
    execution = {
      ...execution,
      deployment_id: deployment?.id ?? null,
      status: "SUCCESS",
      output: value.output,
      execution_time_ms: value.executionTimeMs,
      memory_used: value.memoryUsed,
    };
  } catch (e) {
    const error = e instanceof AppError
      ? e
      : new AppError("WASM_ERROR", "Execution failed.", 422);
    execution = {
      ...execution,
      deployment_id: deployment?.id ?? null,
      status: error.code === "RATE_LIMITED"
        ? "RATE_LIMITED"
        : error.code === "VALIDATION_ERROR"
        ? "VALIDATION_ERROR"
        : error.code.startsWith("BOT_")
        ? "BLOCKED"
        : "RUNTIME_ERROR",
      error_message: error.message,
    };
    await result(db.rpc("record_execution", { p_execution: execution }));
    throw error;
  }
  const executionId = await result(
    db.rpc("record_execution", { p_execution: execution }),
  );
  if (source !== "DASHBOARD") {
    // Persistent outbox is committed by record_execution; failures remain retryable.
    const task = deliver(db, bot.id).catch((e) =>
      console.error("webhook dispatch failed", e)
    );
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(task);
    else await task;
  }
  return {
    ...value,
    requestId,
    executionId,
    version: deployment?.version ?? null,
  };
}
