import {
  assertMethod,
  body,
  limit,
  page,
  result,
  serve,
  settings,
  user,
} from "../_shared/core.ts";
import { SettingsSchema } from "../_shared/schema.ts";
import { AppError } from "../_shared/policy.ts";
import { z } from "zod";
serve(async (req, db) => {
  assertMethod(req, ["GET", "POST"]);
  const u = await user(req, db, true);
  await limit(db, `admin:${u.id}`, 60);
  const url = new URL(req.url),
    resource = url.searchParams.get("resource") || "dashboard",
    id = url.searchParams.get("id");
  if (req.method === "GET") {
    if (resource === "settings") return { settings: await settings(db) };
    if (resource === "dashboard") {
      return await result(db.rpc("admin_overview", { p_user: u.id }));
    }
    if (resource === "monitoring") {
      return {
        bots: await result(
          db.from("bots").select("id,name,run_count,failure_count,status").is(
            "deleted_at",
            null,
          ).gt("run_count", 20).order("failure_count", { ascending: false })
            .limit(100),
        ),
        errors: await result(
          db.from("executions").select("bot_id,status,created_at").neq(
            "status",
            "SUCCESS",
          ).gte("created_at", new Date(Date.now() - 3600000).toISOString())
            .limit(1000),
        ),
      };
    }
    if (resource === "bots" && id) {
      return {
        bot: await result(db.from("bots").select("*").eq("id", id).single()),
        deployments: await result(
          db.from("bot_deployments").select("*").eq("bot_id", id).order(
            "version",
            { ascending: false },
          ),
        ),
        executions: await result(
          db.from("executions").select("*").eq("bot_id", id).order(
            "created_at",
            { ascending: false },
          ).limit(50),
        ),
        analytics: await result(
          db.rpc("bot_analytics", { p_user: u.id, p_bot: id, p_admin: true }),
        ),
      };
    }
    if (resource === "users" && id) {
      return {
        profile: await result(
          db.from("profiles").select("*").eq("id", id).single(),
        ),
        bots: await result(db.from("bots").select("*").eq("user_id", id)),
      };
    }
    if (resource === "executions" && id) {
      return {
        execution: await result(
          db.from("executions").select("*,bots(name),bot_deployments(version)")
            .eq("id", z.string().uuid().parse(id)).single(),
        ),
      };
    }
    if (resource === "users") {
      return {
        rows: await result(
          db.rpc("admin_users", { p_user: u.id, p_offset: page(url)[0] }),
        ),
      };
    }
    const tables: Record<string, string> = {
      users: "profiles",
      bots: "bots",
      reports: "bot_reports",
      logs: "admin_logs",
      executions: "executions",
    };
    const table = tables[resource];
    if (!table) throw new AppError("NOT_FOUND", "Unknown admin resource.", 404);
    return {
      rows: await result(
        db.from(table).select("*").order("created_at", { ascending: false })
          .range(...page(url)),
      ),
    };
  }
  const data = await body(req);
  const action = z.enum([
    "user-status",
    "user-role",
    "user-delete",
    "bot-status",
    "bot-unpublish",
    "bot-delete",
    "report",
    "settings",
  ]).parse(data.action);
  let payload: any = {};
  if (action === "settings") payload = SettingsSchema.parse(data.data);
  else {
    z.string().uuid().parse(data.id);
    if (action === "user-status") {
      payload = { status: z.enum(["ACTIVE", "SUSPENDED"]).parse(data.status) };
    }
    if (action === "user-role") {
      payload = { role: z.enum(["USER", "ADMIN"]).parse(data.role) };
    }
    if (action === "bot-status") {
      payload = {
        status: z.enum(["ACTIVE", "DISABLED", "BLOCKED"]).parse(data.status),
        reason: z.string().max(1000).default("").parse(data.reason),
      };
    }
    if (action === "report") {
      payload = {
        status: z.enum(["REVIEWED", "DISMISSED", "ACTION_TAKEN"]).parse(
          data.status,
        ),
      };
    }
  }
  await result(
    db.rpc("admin_mutation", {
      p_admin: u.id,
      p_action: action,
      p_id: data.id || null,
      p_data: payload,
    }),
  );
  return { message: "Admin action saved to audit log." };
});
