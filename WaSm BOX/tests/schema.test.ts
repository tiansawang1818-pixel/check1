import { describe, expect, it } from "vitest";
import {
  BotSchema,
  gradeTemplate,
  InputSchema,
  RuleSchema,
  validateInput,
} from "../supabase/functions/_shared/schema";
import {
  checkBot,
  checkKey,
  checkOwner,
  domainAllowed,
} from "../supabase/functions/_shared/policy";
describe("rule and input validation", () => {
  it("accepts grade template and valid score", () => {
    expect(BotSchema.parse(gradeTemplate).name).toBe("Grade Calculator");
    expect(validateInput(gradeTemplate.input_schema, { score: 85 })).toEqual({
      score: 85,
    });
  });
  it.each([
    { score: 101 },
    { score: -1 },
    { score: "85" },
    { score: null },
    {},
    { score: 85, process: "env" },
  ])(
    "rejects invalid input %j",
    (input) =>
      expect(() => validateInput(gradeTemplate.input_schema, input)).toThrow(),
  );
  it("rejects arbitrary code and unrecognized fields", () => {
    expect(() => RuleSchema.parse({ code: "return process.env" })).toThrow();
    const b = structuredClone(gradeTemplate);
    b.rule_definition.rules[0].conditions[0].field = "secret";
    expect(() => BotSchema.parse(b)).toThrow();
  });
  it("caps rules and conditions", () => {
    expect(() =>
      RuleSchema.parse({
        ...gradeTemplate.rule_definition,
        rules: Array(101).fill(gradeTemplate.rule_definition.rules[0]),
      })
    ).toThrow();
  });
  it("rejects duplicate input fields", () =>
    expect(() =>
      InputSchema.parse({
        fields: Array(2).fill(gradeTemplate.input_schema.fields[0]),
      })
    ).toThrow());
  it("validates email/date/select/boolean/JSON", () => {
    const schema = InputSchema.parse({
      fields: [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "date", label: "Date", type: "date" },
        { name: "tier", label: "Tier", type: "select", options: ["VIP"] },
        { name: "active", label: "Active", type: "boolean" },
        { name: "data", label: "Data", type: "json" },
      ],
    });
    expect(() =>
      validateInput(schema, {
        email: "a@example.com",
        date: "2026-02-28",
        tier: "VIP",
        active: false,
        data: { a: 1 },
      })
    ).not.toThrow();
    expect(() =>
      validateInput(schema, {
        email: "bad",
        date: "2026-02-31",
        tier: "bad",
        active: 1,
      })
    ).toThrow();
  });
});
describe("permissions", () => {
  it("rejects cross-owner access", () => {
    expect(() => checkOwner({ user_id: "a" }, "b")).toThrow();
  });
  it.each(["BLOCKED", "DISABLED"])(
    "denies %s in test AND production",
    (status) => {
      expect(() => checkBot({ status, is_published: true })).toThrow();
      expect(() => checkBot({ status, is_published: true }, false)).toThrow();
    },
  );
  it("draft runs only in test", () => {
    expect(() => checkBot({ status: "DRAFT", is_published: false })).toThrow();
    expect(() => checkBot({ status: "DRAFT", is_published: false }, false)).not
      .toThrow();
  });
  const key = { user_id: "a", scopes: ["bot:run"], allowed_bot_ids: ["bot1"] };
  it("enforces revocation, owner, scope and selected bot", () => {
    expect(() => checkKey(key, { id: "bot1", user_id: "a" }, "bot:run")).not
      .toThrow();
    for (
      const bad of [{ ...key, revoked_at: "today" }, { ...key, user_id: "b" }, {
        ...key,
        scopes: ["bot:read"],
      }, { ...key, allowed_bot_ids: ["bot2"] }]
    ) {
      expect(() => checkKey(bad, { id: "bot1", user_id: "a" }, "bot:run"))
        .toThrow();
    }
  });
  it("matches exact domain and port; rejects suffix attack", () => {
    expect(domainAllowed(["shop.example.com"], "https://shop.example.com"))
      .toBe(true);
    expect(domainAllowed(["example.com"], "https://example.com.attacker.test"))
      .toBe(false);
    expect(domainAllowed(["localhost:5173"], "http://localhost:5174")).toBe(
      false,
    );
    expect(domainAllowed(["example.com"], null)).toBe(false);
    expect(domainAllowed([], null)).toBe(true);
  });
});

it("validates the output format and reserved field names", () => {
  const b = structuredClone(gradeTemplate);
  b.output_schema.type = "table";
  expect(() => BotSchema.parse(b)).toThrow();
  expect(() =>
    InputSchema.parse({
      fields: [{ name: "constructor", label: "X", type: "text" }],
    })
  ).toThrow();
});
