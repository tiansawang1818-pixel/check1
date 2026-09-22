import {
  assertMethod,
  body,
  ipKey,
  limit,
  result,
  serve,
  settings,
} from "../_shared/core.ts";
import { AppError, checkBot, domainAllowed } from "../_shared/policy.ts";
import { execute } from "../_shared/execution.ts";
import { z } from "zod";
serve(async (req, db, requestId) => {
  assertMethod(req, ["GET", "POST"]);
  const url = new URL(req.url), slug = url.searchParams.get("slug");
  z.string().min(1).max(140).parse(slug);
  const embed = url.searchParams.get("embed") === "true";
  const s = await settings(db), ip = await ipKey(req);
  await limit(db, `public-edge:${ip}`, 100);
  const bot = await result<any>(
    db.from("bots").select("*").eq("public_slug", slug).is("deleted_at", null)
      .maybeSingle(),
  );
  if (!bot) throw new AppError("BOT_NOT_FOUND", "Bot not found.", 404);
  checkBot(bot);
  const owner = await result<any>(
    db.from("profiles").select("status").eq("id", bot.user_id).single(),
  );
  if (owner.status !== "ACTIVE") {
    throw new AppError("BOT_DISABLED", "Bot is unavailable.", 403);
  }
  if (embed) {
    if (!bot.allow_embed || !s.allow_embed) {
      throw new AppError("FORBIDDEN", "Embedding is disabled.", 403);
    }
    if (
      !domainAllowed(
        bot.allowed_domains,
        req.headers.get("x-embed-origin") || req.headers.get("origin"),
      )
    ) {
      throw new AppError(
        "FORBIDDEN",
        "This website is not allowed to embed the bot.",
        403,
      );
    }
  } else if (!bot.allow_public_access || !s.allow_public_bots) {
    throw new AppError("FORBIDDEN", "Public access is disabled.", 403);
  }
  if (req.method === "GET") {
    const d = await result<any>(
      db.from("bot_deployments").select(
        "input_schema_snapshot,output_schema_snapshot,version",
      ).eq("bot_id", bot.id).eq("active", true).single(),
    );
    return {
      bot: {
        name: bot.name,
        description: bot.description,
        public_slug: bot.public_slug,
        input_schema: d.input_schema_snapshot,
        output_schema: d.output_schema_snapshot,
        version: d.version,
        widget: bot.widget,
      },
    };
  }
  const data = await body(req);
  if (data.action === "report") {
    await limit(db, `report:${ip}`, 3);
    const report = z.object({
      reason: z.enum([
        "Spam",
        "Abusive Content",
        "Suspicious Behavior",
        "Broken Bot",
        "Other",
      ]),
      description: z.string().max(2000).default(""),
    }).parse(data);
    await result(db.from("bot_reports").insert({ bot_id: bot.id, ...report }));
    return { message: "Report submitted." };
  }
  return await execute(
    db,
    bot,
    data.input,
    embed ? "EMBED" : "PUBLIC_PAGE",
    requestId,
    `public:${ip}`,
    Math.min(s.public_rate_limit, bot.rate_limit),
  );
});
