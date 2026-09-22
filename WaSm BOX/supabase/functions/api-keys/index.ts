import {
  assertMethod,
  body,
  env,
  hmac,
  limit,
  result,
  serve,
  user,
} from "../_shared/core.ts";
import { KeySchema } from "../_shared/schema.ts";
import { AppError } from "../_shared/policy.ts";
import { z } from "zod";
const safeColumns =
  "id,name,key_prefix,scopes,allowed_bot_ids,last_used_at,usage_count,revoked_at,created_at";
serve(async (req, db) => {
  assertMethod(req, ["GET", "POST", "PATCH", "DELETE"]);
  const u = await user(req, db);
  await limit(db, `keys:${u.id}`, 30);
  const id = new URL(req.url).searchParams.get("id");
  if (req.method === "GET") {
    return {
      keys: await result(
        db.from("api_keys").select(safeColumns).eq("user_id", u.id).is(
          "deleted_at",
          null,
        ).order("created_at", { ascending: false }),
      ),
    };
  }
  if (req.method === "POST" && !id) {
    const data = KeySchema.parse(await body(req));
    if (data.allowed_bot_ids) {
      const bots = await result<any[]>(
        db.from("bots").select("id").eq("user_id", u.id).is("deleted_at", null)
          .in("id", data.allowed_bot_ids),
      );
      if (new Set(data.allowed_bot_ids).size !== bots.length) {
        throw new AppError(
          "FORBIDDEN",
          "Selected bots must belong to you.",
          403,
        );
      }
    }
    const key = `wbot_live_${
      Array.from(crypto.getRandomValues(new Uint8Array(32))).map((v) =>
        v.toString(16).padStart(2, "0")
      ).join("")
    }`;
    const keyId = await result(
      db.rpc("create_api_key", {
        p_user: u.id,
        p_key: {
          ...data,
          key_prefix: key.slice(0, 18),
          key_hash: await hmac(env("API_KEY_HASH_SECRET"), key),
        },
      }),
    );
    return {
      id: keyId,
      key,
      message: "Copy this API key now. You will not be able to see it again.",
    };
  }
  z.string().uuid().parse(id);
  const key = await result<any>(
    db.from("api_keys").select("id").eq("id", id).eq("user_id", u.id).is(
      "deleted_at",
      null,
    ).maybeSingle(),
  );
  if (!key) throw new AppError("NOT_FOUND", "Key not found.", 404);
  if (req.method === "DELETE") {
    await result(
      db.from("api_keys").update({
        deleted_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      }).eq("id", id).eq("user_id", u.id),
    );
    return { message: "Key deleted." };
  }
  const data = await body(req);
  if (data.action === "revoke") {
    await result(
      db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq(
        "id",
        id,
      ).eq("user_id", u.id),
    );
  } else {await result(
      db.from("api_keys").update({
        name: z.string().trim().min(1).max(100).parse(data.name),
      }).eq("id", id).eq("user_id", u.id),
    );}
  return { message: "Key updated." };
});
