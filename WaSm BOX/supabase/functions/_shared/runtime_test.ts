import { runWasm } from "./wasm.ts";
import { gradeTemplate } from "./schema.ts";
import { body, hmac } from "./core.ts";
import { decrypt, encrypt, webhookUrl } from "./webhook.ts";
function assert(value: unknown, message = "Assertion failed") {
  if (!value) throw new Error(message);
}
Deno.test("Deno executes the actual Rust WASM binary", async () => {
  const r = await runWasm(
    gradeTemplate.rule_definition,
    { score: 85 },
    gradeTemplate.input_schema,
  );
  assert(r.output === "A");
  assert(r.memoryUsed <= 32 * 1024 * 1024);
});
Deno.test("HMAC-SHA256 known answer", async () => {
  assert(
    await hmac("key", "The quick brown fox jumps over the lazy dog") ===
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
  );
});
Deno.test("webhook secrets use authenticated encryption", async () => {
  Deno.env.set("WEBHOOK_ENCRYPTION_KEY", btoa("x".repeat(32)));
  const a = await encrypt("secret-at-least-16"),
    b = await encrypt("secret-at-least-16");
  assert(a !== b);
  assert(!a.includes("secret"));
  assert(await decrypt(a) === "secret-at-least-16");
  let rejected = false;
  try {
    await decrypt(a.slice(0, -4) + "AAAA");
  } catch {
    rejected = true;
  }
  assert(rejected);
});
Deno.test("webhook destination policy fails closed", () => {
  Deno.env.set("WEBHOOK_ALLOWED_HOSTS", "hooks.example.com");
  assert(
    webhookUrl("https://hooks.example.com/receive").hostname ===
      "hooks.example.com",
  );
  for (
    const value of [
      "http://hooks.example.com",
      "https://127.0.0.1",
      "https://hooks.example.com.attacker.test",
      "https://user:pass@hooks.example.com",
      "https://hooks.example.com:8443",
    ]
  ) {
    let rejected = false;
    try {
      webhookUrl(value);
    } catch {
      rejected = true;
    }
    assert(rejected, value);
  }
});
Deno.test("streaming request limit enforces 64 KiB without Content-Length", async () => {
  let rejected = false;
  try {
    await body(
      new Request("https://example.com", {
        method: "POST",
        body: "x".repeat(65537),
      }),
    );
  } catch {
    rejected = true;
  }
  assert(rejected);
  assert(
    (await body(
      new Request("https://example.com", {
        method: "POST",
        body: '{"input":{"score":85}}',
      }),
    )).input.score === 85,
  );
});

Deno.test("request complexity and primitive bodies are rejected", async () => {
  for (
    const text of [
      "null",
      "[]",
      "42",
      '{"a":'.repeat(34) + "null" + "}".repeat(34),
    ]
  ) {
    let rejected = false;
    try {
      await body(
        new Request("https://example.com", { method: "POST", body: text }),
      );
    } catch {
      rejected = true;
    }
    assert(rejected);
  }
});
