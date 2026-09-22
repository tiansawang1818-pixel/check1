/** Run only against a dedicated real Supabase test project after migrations and
 * deployment. This creates real Auth users and retained audit/execution data.
 * No fake Auth, REST responses, databases, or WASM substitutes are used. */
import { createClient } from "@supabase/supabase-js";
const url = Deno.env.get("TEST_SUPABASE_URL"),
  anon = Deno.env.get("TEST_SUPABASE_ANON_KEY"),
  service = Deno.env.get("TEST_SUPABASE_SERVICE_ROLE_KEY");
const enabled = Boolean(
  url && anon && service && Deno.env.get("RUN_LIVE_TESTS") === "1",
);
function assert(value: unknown, message = "Assertion failed") {
  if (!value) throw new Error(message);
}
Deno.test({
  name:
    "Live Supabase: Auth, ownership, RLS, draft, publish, API, embed, analytics, admin",
  ignore: !enabled,
  async fn(t) {
    const db = createClient(url!, service!, {
      auth: { persistSession: false },
    });
    const stamp = crypto.randomUUID().slice(0, 8),
      password = `T${crypto.randomUUID()}!`;
    const emails = [
      `wasmbot-a-${stamp}@example.com`,
      `wasmbot-b-${stamp}@example.com`,
      `wasmbot-admin-${stamp}@example.com`,
    ];
    const clients = emails.map(() =>
      createClient(url!, anon!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    );
    const ids: string[] = [], tokens: string[] = [];
    async function call(
      path: string,
      token?: string,
      method = "GET",
      data?: unknown,
      headers: Record<string, string> = {},
    ) {
      const response = await fetch(`${url}/functions/v1/${path}`, {
        method,
        headers: {
          apikey: anon!,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return { status: response.status, ...await response.json() };
    }
    let bot: any, key = "", otherKey = "";
    try {
      await t.step(
        "Register actual users, confirm email for automated test and log in",
        async () => {
          for (let i = 0; i < 3; i++) {
            const signup = await clients[i].auth.signUp({
              email: emails[i],
              password,
              options: { data: { username: `Integration ${i}` } },
            });
            assert(!signup.error, signup.error?.message);
            assert(signup.data.user, "Sign-up user missing");
            ids.push(signup.data.user!.id);
            const confirmed = await db.auth.admin.updateUserById(ids[i], {
              email_confirm: true,
            });
            assert(!confirmed.error, confirmed.error?.message);
            const login = await clients[i].auth.signInWithPassword({
              email: emails[i],
              password,
            });
            assert(!login.error, login.error?.message);
            tokens.push(login.data.session!.access_token);
          }
          assert(
            !(await db.from("profiles").update({ role: "ADMIN" }).eq(
              "id",
              ids[2],
            )).error,
          );
        },
      );
      const draft = {
        name: `Grade ${stamp}`,
        description: "Integration grade bot",
        category: "Education",
        input_schema: {
          fields: [{
            name: "score",
            label: "Score",
            type: "number",
            required: true,
            min: 0,
            max: 100,
          }],
        },
        output_schema: { type: "text" },
        rule_definition: {
          version: 1,
          rules: [80, 70, 60, 50].map((value, i) => ({
            conditions: [{ field: "score", operator: ">=", value }],
            match: "AND",
            output: ["A", "B", "C", "D"][i],
          })),
          defaultOutput: "F",
        },
        allow_public_access: true,
        allow_api_access: true,
        allow_embed: true,
        allowed_domains: [],
        rate_limit: 100,
      };
      await t.step("Create bot and verify persisted row/profile", async () => {
        const r = await call("studio", tokens[0], "POST", draft);
        assert(r.success, JSON.stringify(r));
        bot = r.bot;
        const persisted = await clients[0].from("bots").select("*").eq(
          "id",
          bot.id,
        ).single();
        assert(persisted.data?.name === draft.name);
        assert(
          (await clients[0].from("profiles").select("*").eq("id", ids[0])
            .single()).data?.username === "Integration 0",
        );
      });
      await t.step(
        "Cross-owner read/write and service-only RPC are rejected",
        async () => {
          assert(
            (await call(`studio?id=${bot.id}`, tokens[1], "PUT", draft))
              .status === 403,
          );
          assert(
            (await clients[1].from("bots").select("*").eq("id", bot.id)).data
              ?.length === 0,
          );
          assert(
            (await clients[0].rpc("publish_bot", {
              p_bot: bot.id,
              p_user: ids[0],
            })).error,
          );
          assert(
            (await clients[0].from("profiles").update({ role: "ADMIN" }).eq(
              "id",
              ids[0],
            )).error,
          );
        },
      );
      await t.step(
        "Draft WASM test returns A and records execution",
        async () => {
          const r = await call("run-bot", tokens[0], "POST", {
            botId: bot.id,
            input: { score: 85 },
          });
          assert(r.success && r.output === "A", JSON.stringify(r));
          assert(
            (await clients[0].from("executions").select("id").eq(
              "request_id",
              r.requestId,
            )).data?.length === 1,
          );
        },
      );
      await t.step("Publish V1 and run public score 72", async () => {
        const p = await call(`studio?id=${bot.id}`, tokens[0], "POST", {
          action: "publish",
        });
        assert(p.success && p.deployment.version === 1, JSON.stringify(p));
        const r = await call(
          `public-bot?slug=${bot.public_slug}`,
          undefined,
          "POST",
          { input: { score: 72 } },
        );
        assert(r.output === "B", JSON.stringify(r));
      });
      await t.step(
        "Draft edits do not change V1; publishing creates V2",
        async () => {
          const edit = structuredClone(draft);
          edit.rule_definition.rules[0].output = "A2";
          assert(
            (await call(`studio?id=${bot.id}`, tokens[0], "PUT", edit)).success,
          );
          assert(
            (await call(
              `public-bot?slug=${bot.public_slug}`,
              undefined,
              "POST",
              {
                input: { score: 95 },
              },
            )).output === "A",
          );
          assert(
            (await call(`studio?id=${bot.id}`, tokens[0], "POST", {
              action: "publish",
            })).deployment.version === 2,
          );
          assert(
            (await call(
              `public-bot?slug=${bot.public_slug}`,
              undefined,
              "POST",
              {
                input: { score: 95 },
              },
            )).output === "A2",
          );
        },
      );
      await t.step(
        "Create scoped API key; API runs real deployment",
        async () => {
          const r = await call("api-keys", tokens[0], "POST", {
            name: "Integration",
            scopes: ["bot:run"],
            allowed_bot_ids: [bot.id],
          });
          assert(r.success, JSON.stringify(r));
          key = r.key;
          otherKey = r.id;
          const api = await call("api-run", key, "POST", {
            bot: bot.public_slug,
            input: { score: 95 },
          });
          assert(api.data === "A2", JSON.stringify(api));
          assert(
            (await call("api-run", "wbot_live_" + "0".repeat(64), "POST", {
              bot: bot.public_slug,
              input: { score: 95 },
            })).error.code === "INVALID_API_KEY",
          );
          const list = await call("api-keys", tokens[0]);
          assert(!JSON.stringify(list).includes(key));
        },
      );
      await t.step(
        "Embed executes; disallowed domain is rejected",
        async () => {
          const full = (await call(`studio?id=${bot.id}`, tokens[0])).bot;
          const edit = {
            ...draft,
            rule_definition: full.rule_definition,
            allowed_domains: ["allowed.example.com"],
          };
          assert(
            (await call(`studio?id=${bot.id}`, tokens[0], "PUT", edit)).success,
          );
          const path = `public-bot?slug=${bot.public_slug}&embed=true`;
          assert(
            (await call(path, undefined, "POST", { input: { score: 72 } }, {
              "x-embed-origin": "https://allowed.example.com",
            })).output === "B",
          );
          assert(
            (await call(path, undefined, "GET", undefined, {
              "x-embed-origin": "https://denied.example.com",
            })).status === 403,
          );
        },
      );
      await t.step(
        "Analytics uses saved records; ordinary user cannot administer",
        async () => {
          assert(
            (await call(`studio?resource=analytics&id=${bot.id}`, tokens[0]))
              .analytics.totals.total >= 6,
          );
          assert((await call("admin", tokens[0])).status === 403);
          assert((await call("admin", tokens[2])).success);
        },
      );
      await t.step(
        "Admin disable denies test/public/API/embed; enable restores service",
        async () => {
          assert(
            (await call("admin", tokens[2], "POST", {
              action: "bot-status",
              id: bot.id,
              status: "DISABLED",
              reason: "Integration verification",
            })).success,
          );
          for (
            const [path, token, data] of [
              ["run-bot", tokens[0], { botId: bot.id, input: { score: 85 } }],
              [`public-bot?slug=${bot.public_slug}`, undefined, {
                input: { score: 85 },
              }],
              ["api-run", key, { bot: bot.public_slug, input: { score: 85 } }],
              [`public-bot?slug=${bot.public_slug}&embed=true`, undefined, {
                input: { score: 85 },
              }],
            ] as const
          ) {
            assert(
              (await call(path, token, "POST", data, {
                "x-embed-origin": "https://allowed.example.com",
              })).error.code === "BOT_DISABLED",
            );
          }
          assert(
            (await call("admin", tokens[2], "POST", {
              action: "bot-status",
              id: bot.id,
              status: "ACTIVE",
              reason: "",
            })).success,
          );
          assert(
            (await call("api-run", key, "POST", {
              bot: bot.public_slug,
              input: { score: 85 },
            })).data === "A2",
          );
        },
      );
      await t.step("Blocked bot cannot be enabled by owner", async () => {
        assert(
          (await call("admin", tokens[2], "POST", {
            action: "bot-status",
            id: bot.id,
            status: "BLOCKED",
            reason: "Integration verification",
          })).success,
        );
        assert(
          (await call(`studio?id=${bot.id}`, tokens[0], "POST", {
            action: "status",
            status: "ACTIVE",
          })).status === 403,
        );
        await call("admin", tokens[2], "POST", {
          action: "bot-status",
          id: bot.id,
          status: "ACTIVE",
          reason: "",
        });
      });
      await t.step("Revoke API key immediately rejects reuse", async () => {
        assert(
          (await call(`api-keys?id=${otherKey}`, tokens[0], "POST", {
            action: "revoke",
          })).success,
        );
        assert(
          (await call("api-run", key, "POST", {
            bot: bot.public_slug,
            input: { score: 85 },
          })).error.code === "API_KEY_REVOKED",
        );
      });
      await t.step(
        "Atomic shared rate limit rejects excess requests",
        async () => {
          const values = await Promise.all(
            Array.from({ length: 5 }, () =>
              db.rpc("consume_limit", {
                p_key: `integration:${stamp}`,
                p_limit: 3,
              })),
          );
          assert(
            values.filter((v) => v.data === true).length === 3,
          );
        },
      );
    } finally {
      // Keep audit/executions even when a step fails. Deactivate only IDs created by this test.
      if (ids.length) {
        await db.from("bots").update({
          deleted_at: new Date().toISOString(),
          is_published: false,
        }).in("user_id", ids);
        await db.from("api_keys").update({
          revoked_at: new Date().toISOString(),
        }).in("user_id", ids);
        await db.from("profiles").update({ status: "SUSPENDED" }).in("id", ids);
        for (const id of ids) {
          await db.auth.admin.updateUserById(id, { ban_duration: "876000h" });
        }
      }
      for (const client of clients) await client.auth.signOut();
    }
  },
});
