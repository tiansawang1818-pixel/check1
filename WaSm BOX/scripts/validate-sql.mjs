import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
// Real embedded PostgreSQL. Only the platform-owned auth schema/roles are supplied
// as a test harness; this does not implement or claim to test Supabase Auth.
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
await db.exec(
  readFileSync(
    new URL("../supabase/migrations/202609210001_initial.sql", import.meta.url),
    "utf8",
  ),
);
let checks = 1;
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333";
await db.query(
  `insert into auth.users(id,email) values ($1,'a@test.invalid'),($2,'b@test.invalid'),($3,'admin@test.invalid')`,
  [a, b, admin],
);
assert.equal((await db.query("select * from public.profiles")).rows.length, 3);
checks++;
await db.query("update profiles set role='ADMIN' where id=$1", [admin]);
const draft = {
  name: "Grade bot",
  description: "",
  category: "Education",
  input_schema: {
    fields: [{ name: "score", type: "number", label: "Score", required: true }],
  },
  output_schema: { type: "text" },
  rule_definition: { version: 1, rules: [], defaultOutput: "V1" },
  allow_public_access: true,
  allow_api_access: true,
  allow_embed: true,
  allowed_domains: [],
  widget: {},
  rate_limit: 20,
};
const bot = (await db.query("select * from public.create_bot($1,$2,$3)", [
  a,
  draft,
  "grade-test",
])).rows[0];
checks++;
const v1 =
  (await db.query("select * from public.publish_bot($1,$2)", [bot.id, a]))
    .rows[0];
assert.equal(v1.version, 1);
checks++;
await db.query("update bots set rule_definition=$1 where id=$2", [{
  version: 1,
  rules: [],
  defaultOutput: "V2",
}, bot.id]);
assert.equal(
  (await db.query(
    "select rule_snapshot from bot_deployments where bot_id=$1 and active",
    [bot.id],
  )).rows[0].rule_snapshot.defaultOutput,
  "V1",
);
checks++;
const v2 =
  (await db.query("select * from public.publish_bot($1,$2)", [bot.id, a]))
    .rows[0];
assert.equal(v2.version, 2);
assert.equal(
  (await db.query(
    "select count(*)::int n from bot_deployments where bot_id=$1 and active",
    [bot.id],
  )).rows[0].n,
  1,
);
checks++;
await db.exec(`set role authenticated;set "request.jwt.claim.sub"='${b}';`);
assert.equal((await db.query("select * from bots")).rows.length, 0);
checks++;
await assert.rejects(() =>
  db.query("update profiles set role='ADMIN' where id=$1", [b])
);
checks++;
await assert.rejects(() => db.query("select * from api_keys"));
checks++;
await assert.rejects(() =>
  db.query("select public.publish_bot($1,$2)", [bot.id, a])
);
checks++;
await db.exec(`set "request.jwt.claim.sub"='${a}';`);
assert.equal((await db.query("select * from bots")).rows.length, 1);
checks++;
await db.query("update profiles set username=$1 where id=$2", [
  "Allowed name",
  a,
]);
checks++;
await assert.rejects(() =>
  db.query("update bots set status='ACTIVE' where id=$1", [bot.id])
);
checks++;
await db.exec("reset role;");
for (const expected of [true, true, false]) {
  assert.equal(
    (await db.query("select consume_limit($1,2) allowed", ["rate-test"]))
      .rows[0].allowed,
    expected,
  );
}
checks++;
await assert.rejects(() =>
  db.query("select public.admin_mutation($1,$2,$3,$4)", [
    a,
    "bot-status",
    bot.id,
    { status: "DISABLED", reason: "test" },
  ])
);
checks++;
await db.query("select public.admin_mutation($1,$2,$3,$4)", [
  admin,
  "bot-status",
  bot.id,
  { status: "BLOCKED", reason: "Policy violation" },
]);
await assert.rejects(() =>
  db.query("select public.publish_bot($1,$2)", [bot.id, a])
);
checks++;
assert.equal((await db.query("select * from admin_logs")).rows.length, 1);
checks++;
await db.query("select public.admin_mutation($1,$2,$3,$4)", [
  admin,
  "bot-status",
  bot.id,
  { status: "ACTIVE", reason: "" },
]);
const requestId = "44444444-4444-4444-8444-444444444444";
await db.query("select record_execution($1)", [{
  bot_id: bot.id,
  request_id: requestId,
  source: "PUBLIC_PAGE",
  input: { score: 85 },
  output: "A",
  status: "SUCCESS",
  execution_time_ms: 3,
}]);
const counts = (await db.query(
  "select run_count,success_count,failure_count from bots where id=$1",
  [bot.id],
)).rows[0];
assert.equal(Number(counts.run_count), 1);
assert.equal(Number(counts.success_count), 1);
checks++;
const analytics =
  (await db.query("select bot_analytics($1,$2) a", [a, bot.id])).rows[0].a;
assert.equal(analytics.totals.total, 1);
assert.equal(analytics.daily.length, 30);
checks++;
// Exercise transactional lifecycle, API-key caps and outbox claims on PostgreSQL.
await db.query("select owner_mutation($1,$2,'status','DISABLED')", [a, bot.id]);
await assert.rejects(() => db.query("select publish_bot($1,$2)", [bot.id, a]));
await db.query("select owner_mutation($1,$2,'status','ACTIVE')", [a, bot.id]);
checks++;
await db.query("select owner_mutation($1,$2,'unpublish')", [a, bot.id]);
assert.equal(
  (await db.query(
    "select count(*)::int n from bot_deployments where bot_id=$1 and active",
    [bot.id],
  )).rows[0].n,
  0,
);
await db.query("select publish_bot($1,$2)", [bot.id, a]);
checks++;
await assert.rejects(() =>
  db.query("select owner_mutation($1,$2,'status','ACTIVE')", [b, bot.id])
);
checks++;
const overview =
  (await db.query("select admin_overview($1) d", [admin])).rows[0].d;
assert.equal(overview.stats.users, 3);
assert.equal(overview.analytics.totals.total, 1);
assert.equal(overview.analytics.botCounts.total, 1);
checks++;
await db.query(
  "update system_settings set value='1' where key='max_api_keys_per_user'",
);
const keyId = (await db.query("select create_api_key($1,$2) id", [a, {
  name: "Test",
  key_prefix: "wbot_live_prefix",
  key_hash: "test-only-hash",
  scopes: ["bot:run"],
  allowed_bot_ids: [bot.id],
}])).rows[0].id;
await assert.rejects(() =>
  db.query("select create_api_key($1,$2)", [a, {
    name: "Extra",
    key_prefix: "wbot_live_2",
    key_hash: "another-test-hash",
    scopes: ["bot:run"],
    allowed_bot_ids: null,
  }])
);
checks++;
await db.query("select record_key_use($1)", [keyId]);
assert.equal(
  Number(
    (await db.query("select usage_count from api_keys where id=$1", [keyId]))
      .rows[0].usage_count,
  ),
  1,
);
checks++;
assert.equal(
  (await db.query("select * from admin_users($1,0)", [admin])).rows.find((p) =>
    p.id === a
  ).bot_count,
  1,
);
checks++;
await db.query("update api_keys set revoked_at=now() where id=$1", [keyId]);
await assert.rejects(() =>
  db.query("select record_execution($1)", [{
    bot_id: bot.id,
    request_id: "66666666-6666-4666-8666-666666666666",
    api_key_id: keyId,
    source: "API",
    input: { score: 85 },
    output: "A",
    status: "SUCCESS",
    execution_time_ms: 1,
  }])
);
checks++;
const webhook = (await db.query(
  "insert into bot_webhooks(bot_id,url,secret_encrypted,enabled) values($1,'https://hooks.example.com','test-ciphertext',true) returning id",
  [bot.id],
)).rows[0];
await db.query("select record_execution($1)", [{
  bot_id: bot.id,
  request_id: "77777777-7777-4777-8777-777777777777",
  source: "PUBLIC_PAGE",
  input: { score: 85 },
  output: "A",
  status: "SUCCESS",
  execution_time_ms: 1,
}]);
assert.equal(
  (await db.query(
    "select count(*)::int n from webhook_deliveries where webhook_id=$1",
    [webhook.id],
  )).rows[0].n,
  1,
);
checks++;
const claim =
  (await db.query("select * from claim_deliveries($1)", [bot.id])).rows[0];
assert.equal(claim.attempt_count, 1);
assert.equal(
  (await db.query("select * from claim_deliveries($1)", [bot.id])).rows.length,
  0,
);
checks++;
for (const attempt of [2, 3]) {
  await db.query(
    "update webhook_deliveries set status='PENDING',next_attempt_at=now() where id=$1",
    [claim.id],
  );
  assert.equal(
    (await db.query("select * from claim_deliveries($1)", [bot.id])).rows[0]
      .attempt_count,
    attempt,
  );
}
checks++;
await db.query(
  "update webhook_deliveries set locked_at=now()-interval '2 minutes' where id=$1",
  [claim.id],
);
await db.query("select maintenance()");
assert.equal(
  (await db.query("select status from webhook_deliveries where id=$1", [
    claim.id,
  ])).rows[0].status,
  "FAILED",
);
checks++;

await db.query("select public.admin_mutation($1,$2,$3,$4)", [
  admin,
  "user-status",
  a,
  { status: "SUSPENDED" },
]);
await db.exec(`set role authenticated;set "request.jwt.claim.sub"='${a}';`);
assert.equal((await db.query("select * from bots")).rows.length, 0);
checks++;
await db.exec("reset role;");
await db.query("select public.admin_mutation($1,$2,$3,$4)", [
  admin,
  "settings",
  null,
  { allow_registration: false },
]);
await assert.rejects(() =>
  db.query(
    "insert into auth.users(id,email) values('55555555-5555-4555-8555-555555555555','closed@test.invalid')",
  )
);
checks++;
const rls = (await db.query(
  "select count(*)::int n from pg_tables where schemaname='public' and rowsecurity",
)).rows[0].n;
assert.equal(rls, 11);
checks++;
await db.close();
console.log(
  `PostgreSQL migration/security: ${checks} checks passed (PGlite). Supabase Auth/network integration is not exercised.`,
);
