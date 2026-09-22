import {
  assertMethod,
  body,
  limit,
  owned,
  result,
  serve,
  user,
} from "../_shared/core.ts";
import { execute } from "../_shared/execution.ts";
import { AppError } from "../_shared/policy.ts";
serve(async (req, db, requestId) => {
  assertMethod(req, ["POST"]);
  const u = await user(req, db);
  await limit(db, `test-user:${u.id}`, 60);
  const data = await body(req);
  let bot;
  if (data.admin === true) {
    if (u.role !== "ADMIN") {
      throw new AppError("FORBIDDEN", "Admin required.", 403);
    }
    bot = await result<any>(
      db.from("bots").select("*").eq("id", data.botId).is("deleted_at", null)
        .single(),
    );
  } else bot = await owned(db, data.botId, u.id);
  return await execute(
    db,
    bot,
    data.input,
    "DASHBOARD",
    requestId,
    `test:${u.id}:${bot.id}`,
    30,
    u.id,
  );
});
