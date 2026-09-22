import {
  assertMethod,
  body,
  limit,
  owned,
  page,
  result,
  serve,
  user,
} from "../_shared/core.ts";
import { BotSchema } from "../_shared/schema.ts";
import { AppError } from "../_shared/policy.ts";
import { z } from "zod";
serve(async (req, db) => {
  assertMethod(req, ["GET", "POST", "PUT", "DELETE"]);
  const u = await user(req, db);
  await limit(db, `studio:${u.id}`, 120);
  const url = new URL(req.url),
    resource = url.searchParams.get("resource") || "bots",
    id = url.searchParams.get("id");
  if (resource === "analytics") {
    if (id) await owned(db, id, u.id);
    return {
      analytics: await result(
        db.rpc("bot_analytics", { p_user: u.id, p_bot: id }),
      ),
    };
  }
  if (resource === "executions") {
    let query = db.from("executions").select(
      "*,bots!inner(name,user_id),bot_deployments(version)",
    ).eq(
      "bots.user_id",
      u.id,
    ).order("created_at", { ascending: false });
    if (id) query = query.eq("id", z.string().uuid().parse(id));
    if (url.searchParams.get("bot")) {
      query = query.eq("bot_id", url.searchParams.get("bot"));
    }
    for (const f of ["status", "source"]) {
      if (url.searchParams.get(f)) {
        query = query.eq(f, url.searchParams.get(f));
      }
    }
    if (url.searchParams.get("date")) {
      const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(
        url.searchParams.get("date"),
      );
      query = query.gte("created_at", date).lt(
        "created_at",
        new Date(Date.parse(date) + 86400000).toISOString(),
      );
    }
    return { executions: await result(query.range(...page(url))) };
  }
  if (resource !== "bots") {
    throw new AppError("NOT_FOUND", "Unknown resource.", 404);
  }
  if (req.method === "GET") {
    if (id) {
      const bot = await owned(db, id, u.id);
      const deployments = await result<any[]>(
        db.from("bot_deployments").select("*").eq("bot_id", id).order(
          "version",
          { ascending: false },
        ),
      );
      return { bot, deployments };
    }
    return {
      bots: await result(
        db.from("bots").select("*,bot_deployments(version,active)").eq(
          "user_id",
          u.id,
        ).is("deleted_at", null).order("created_at", { ascending: false })
          .range(...page(url)),
      ),
    };
  }
  if (req.method === "POST" && !id) {
    const draft = BotSchema.parse(await body(req));
    const slug = `${
      draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        .slice(0, 70) || "bot"
    }-${crypto.randomUUID().slice(0, 8)}`;
    return {
      bot: await result(
        db.rpc("create_bot", { p_user: u.id, p_bot: draft, p_slug: slug }),
      ),
    };
  }
  if (!id) throw new AppError("VALIDATION_ERROR", "Bot ID required.");
  const b = await owned(db, id, u.id);
  if (req.method === "DELETE") {
    await result(
      db.rpc("owner_mutation", { p_user: u.id, p_bot: id, p_action: "delete" }),
    );
    return { message: "Bot deleted; history retained." };
  }
  const data = await body(req);
  if (data.action === "publish") {
    BotSchema.parse(
      Object.fromEntries(
        Object.keys(BotSchema.innerType().shape).map((k) => [k, b[k]]),
      ),
    );
    return {
      deployment: await result(
        db.rpc("publish_bot", { p_bot: id, p_user: u.id }),
      ),
    };
  }
  if (data.action === "unpublish") {
    await result(
      db.rpc("owner_mutation", {
        p_user: u.id,
        p_bot: id,
        p_action: "unpublish",
      }),
    );
    return { message: "Bot unpublished." };
  }
  if (data.action === "status") {
    const status = z.enum(["ACTIVE", "DISABLED"]).parse(data.status);
    await result(
      db.rpc("owner_mutation", {
        p_user: u.id,
        p_bot: id,
        p_action: "status",
        p_status: status,
      }),
    );
    return { message: "Status updated." };
  }
  if (b.status === "BLOCKED") {
    throw new AppError("BOT_BLOCKED", "Blocked bots cannot be edited.", 403);
  }
  const draft = BotSchema.parse(data);
  const updated = await result(
    db.from("bots").update(draft).eq("id", id).eq("user_id", u.id).neq(
      "status",
      "BLOCKED",
    ).select().single(),
  );
  return { bot: updated };
});
