import { z } from "zod";
export const operators = [
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
] as const;
export const fieldTypes = [
  "text",
  "number",
  "boolean",
  "email",
  "date",
  "select",
  "textarea",
  "json",
] as const;
const jsonValue: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string().max(32768),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue).max(1000),
    z.record(jsonValue),
  ])
);
export const FieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/).refine(
    (name) => !["constructor", "prototype", "__proto__"].includes(name),
    "Reserved field name",
  ),
  label: z.string().min(1).max(100),
  type: z.enum(fieldTypes),
  required: z.boolean().default(false),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  options: z.array(z.string().max(200)).max(100).optional(),
}).strict();
export const InputSchema = z.object({
  fields: z.array(FieldSchema).min(1).max(50),
}).superRefine((v, c) => {
  if (new Set(v.fields.map((f) => f.name)).size !== v.fields.length) {
    c.addIssue({ code: "custom", message: "Field names must be unique" });
  }
  v.fields.forEach((f, i) => {
    if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
      c.addIssue({
        code: "custom",
        path: ["fields", i],
        message: "Minimum cannot exceed maximum",
      });
    }
    if (f.type === "select" && !f.options?.length) {
      c.addIssue({
        code: "custom",
        path: ["fields", i],
        message: "Select needs options",
      });
    }
  });
});
export const RuleSchema = z.object({
  version: z.literal(1),
  rules: z.array(
    z.object({
      conditions: z.array(
        z.object({
          field: z.string().max(64),
          operator: z.enum(operators),
          value: jsonValue.optional(),
        }).strict(),
      ).min(1).max(20),
      match: z.enum(["AND", "OR"]).default("AND"),
      output: jsonValue,
    }).strict(),
  ).max(100),
  defaultOutput: jsonValue,
}).strict();
export const WidgetSchema = z.object({
  title: z.string().max(100).default(""),
  buttonText: z.string().min(1).max(60).default("Run bot"),
  placeholder: z.string().max(100).default(""),
  theme: z.enum(["light", "dark", "system"]).default("light"),
  showBotName: z.boolean().default(true),
  showPoweredBy: z.boolean().default(true),
});
export const BotSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(2000).default(""),
  category: z.string().max(80).default("General"),
  input_schema: InputSchema,
  output_schema: z.object({
    type: z.enum(["text", "number", "boolean", "json", "message", "table"]),
  }),
  rule_definition: RuleSchema,
  allow_public_access: z.boolean().default(false),
  allow_api_access: z.boolean().default(false),
  allow_embed: z.boolean().default(false),
  allowed_domains: z.array(
    z.string().regex(
      /^(localhost|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?::\d{1,5})?$/,
    ),
  ).max(30).default([]),
  rate_limit: z.number().int().min(1).max(1000).default(20),
  widget: WidgetSchema.default({}),
}).strict().superRefine((b, c) => {
  const outputType = b.output_schema.type;
  for (
    const output of [
      ...b.rule_definition.rules.map((r) => r.output),
      b.rule_definition.defaultOutput,
    ]
  ) {
    const valid = outputType === "json" ||
      (outputType === "table"
        ? Array.isArray(output) &&
          output.every((row) =>
            row && typeof row === "object" && !Array.isArray(row)
          )
        : typeof output ===
          (outputType === "message" || outputType === "text"
            ? "string"
            : outputType));
    if (!valid) {
      c.addIssue({
        code: "custom",
        message:
          `Every rule output must match the ${outputType} output format.`,
      });
    }
  }
  const names = new Set(b.input_schema.fields.map((f) => f.name));
  for (const r of b.rule_definition.rules) {
    for (const cond of r.conditions) {
      if (!names.has(cond.field)) {
        c.addIssue({ code: "custom", message: `Unknown field: ${cond.field}` });
      }
      if (
        !["is_empty", "is_not_empty"].includes(cond.operator) &&
        cond.value === undefined
      ) {
        c.addIssue({ code: "custom", message: "Condition value is required" });
      }
    }
  }
});
export const SettingsSchema = z.object({
  max_bots_per_user: z.number().int().min(1).max(1000),
  public_rate_limit: z.number().int().min(1).max(1000),
  api_rate_limit: z.number().int().min(1).max(1000),
  max_api_keys_per_user: z.number().int().min(1).max(100),
  allow_registration: z.boolean(),
  allow_public_bots: z.boolean(),
  allow_api_access: z.boolean(),
  allow_embed: z.boolean(),
}).strict();
export const KeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(["bot:run", "bot:read", "execution:read"])).min(1).max(
    3,
  ).default(["bot:run"]),
  allowed_bot_ids: z.array(z.string().uuid()).min(1).max(100).nullable()
    .default(null),
}).strict();
export type Field = z.infer<typeof FieldSchema>;
export type Rules = z.infer<typeof RuleSchema>;
export type BotDraft = z.infer<typeof BotSchema>;
export type Bot = BotDraft & {
  id: string;
  user_id: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED" | "BLOCKED";
  is_published: boolean;
  public_slug: string;
  run_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  production_version?: number;
  disabled_reason?: string;
};
export function validateInput(
  schema: z.infer<typeof InputSchema>,
  value: unknown,
) {
  const input = z.record(z.unknown()).parse(value);
  const issues: string[] = [];
  for (const f of schema.fields) {
    const v = input[f.name];
    if (v === undefined || v === null || v === "") {
      if (f.required) issues.push(`${f.label} is required`);
      continue;
    }
    if (f.type === "number") {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        issues.push(`${f.label} must be a number`);
      } else if (
        (f.min !== undefined && v < f.min) || (f.max !== undefined && v > f.max)
      ) issues.push(`${f.label} is outside its allowed range`);
    } else if (f.type === "boolean") {
      if (typeof v !== "boolean") issues.push(`${f.label} must be boolean`);
    } else if (f.type === "json") {
      if (!jsonValue.safeParse(v).success) {
        issues.push(`${f.label} must be JSON`);
      }
    } else if (typeof v !== "string") issues.push(`${f.label} must be text`);
    else {
      if (f.type === "email" && !z.string().email().safeParse(v).success) {
        issues.push(`${f.label} must be an email`);
      }
      if (
        f.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v)
      ) issues.push(`${f.label} must be a date`);
      if (f.type === "select" && !f.options?.includes(v)) {
        issues.push(`${f.label} is not an option`);
      }
      if (
        f.min !== undefined && v.length < f.min ||
        f.max !== undefined && v.length > f.max
      ) issues.push(`${f.label} has invalid length`);
    }
  }
  if (
    Object.keys(input).some((k) => !schema.fields.some((f) => f.name === k))
  ) issues.push("Unexpected input field");
  if (issues.length) throw new Error(issues.join("; "));
  return input;
}
export const gradeTemplate: BotDraft = {
  name: "Grade Calculator",
  description: "Turn a score into a letter grade.",
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
  allow_public_access: false,
  allow_api_access: false,
  allow_embed: false,
  allowed_domains: [],
  rate_limit: 20,
  widget: {
    title: "",
    buttonText: "Calculate grade",
    placeholder: "",
    theme: "light",
    showBotName: true,
    showPoweredBy: true,
  },
};
