import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Code2, Plus, Save, Trash2 } from "lucide-react";
import {
  type BotDraft,
  BotSchema,
  type Field,
  fieldTypes,
  gradeTemplate,
  operators,
  RuleSchema,
} from "../../../supabase/functions/_shared/schema";
import { useAction } from "../lib/context";
import { ErrorBox, Loading } from "./ui";
const AdvancedEditor = lazy(() => import("./AdvancedEditor"));
function parseValue(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
function ValueInput(
  { value, onChange, label = "Value" }: {
    value: unknown;
    onChange: (v: unknown) => void;
    label?: string;
  },
) {
  const [text, setText] = useState(
    typeof value === "string" ? value : JSON.stringify(value),
  );
  useEffect(() => {
    if (JSON.stringify(parseValue(text || "")) !== JSON.stringify(value)) {
      setText(typeof value === "string" ? value : JSON.stringify(value));
    }
  }, [value]);
  return (
    <label>
      {label}
      <input
        value={text ?? ""}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseValue(e.target.value));
        }}
        placeholder="Text or JSON"
      />
    </label>
  );
}
export function Builder(
  { initial = gradeTemplate, onSave, steps = false }: {
    initial?: BotDraft;
    onSave: (bot: BotDraft) => Promise<void>;
    steps?: boolean;
  },
) {
  const [draft, setDraft] = useState<BotDraft>(structuredClone(initial)),
    [step, setStep] = useState(0),
    [advanced, setAdvanced] = useState(false),
    [json, setJson] = useState(
      JSON.stringify(initial.rule_definition, null, 2),
    ),
    [error, setError] = useState("");
  const { busy, run } = useAction();
  const change = (key: keyof BotDraft, value: unknown) =>
    setDraft((x) => ({ ...x, [key]: value }));
  const fields = draft.input_schema.fields;
  const fieldChange = (i: number, patch: Partial<Field>) =>
    change("input_schema", {
      fields: fields.map((f, j) => i === j ? { ...f, ...patch } : f),
    });
  const rules = draft.rule_definition.rules;
  const applyJson = () => {
    const rule = RuleSchema.parse(JSON.parse(json));
    change("rule_definition", rule);
    return rule;
  };
  return (
    <>
      <div className="builder-steps">
        {[
          "Information",
          "Input fields",
          "Rules",
          ...(steps ? ["Test", "Deploy"] : []),
        ].map((s, i) => (
          <button
            key={s}
            disabled={i > 2}
            className={step === i ? "selected" : ""}
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      {steps && (
        <p className="muted">Save your bot to unlock testing and deployment.</p>
      )}
      <div className="panel builder">
        {step === 0 && (
          <>
            <h2>Bot information</h2>
            <p className="muted">
              Give your bot a name that explains what it does.
            </p>
            <label>
              Bot name<input
                required
                maxLength={100}
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label>
              Description<textarea
                maxLength={2000}
                value={draft.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Category<select
                  value={draft.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {[
                    "General",
                    "Education",
                    "Commerce",
                    "Validation",
                    "Automation",
                    "Support",
                    ...(![
                        "General",
                        "Education",
                        "Commerce",
                        "Validation",
                        "Automation",
                        "Support",
                      ].includes(draft.category)
                      ? [draft.category]
                      : []),
                  ].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Output format<select
                  value={draft.output_schema.type}
                  onChange={(e) =>
                    change("output_schema", { type: e.target.value })}
                >
                  {["text", "number", "boolean", "json", "message", "table"]
                    .map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Input fields</h2>
            <p className="muted">
              These fields become the form on your public page and widget.
            </p>
            {fields.map((f, i) => (
              <div className="field-card" key={i}>
                <div className="form-grid">
                  <label>
                    Field name<input
                      value={f.name}
                      onChange={(e) => fieldChange(i, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    Label<input
                      value={f.label}
                      onChange={(e) =>
                        fieldChange(i, { label: e.target.value })}
                    />
                  </label>
                  <label>
                    Type<select
                      value={f.type}
                      onChange={(e) =>
                        fieldChange(i, {
                          type: e.target.value as Field["type"],
                        })}
                    >
                      {fieldTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) =>
                        fieldChange(i, { required: e.target.checked })}
                    />Required
                  </label>
                  {["number", "text", "textarea"].includes(f.type) && (
                    <>
                      <label>
                        Minimum{f.type !== "number" ? " length" : ""}
                        <input
                          type="number"
                          value={f.min ?? ""}
                          onChange={(e) =>
                            fieldChange(i, {
                              min: e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            })}
                        />
                      </label>
                      <label>
                        Maximum{f.type !== "number" ? " length" : ""}
                        <input
                          type="number"
                          value={f.max ?? ""}
                          onChange={(e) =>
                            fieldChange(i, {
                              max: e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            })}
                        />
                      </label>
                    </>
                  )}
                  {f.type === "select" && (
                    <label>
                      Options (comma separated)<input
                        value={f.options?.join(",") ?? ""}
                        onChange={(e) =>
                          fieldChange(i, {
                            options: e.target.value.split(",").map((s) =>
                              s.trim()
                            ),
                          })}
                      />
                    </label>
                  )}
                </div>
                <button
                  className="danger-text"
                  aria-label={`Remove ${f.label}`}
                  onClick={() =>
                    change("input_schema", {
                      fields: fields.filter((_, j) => i !== j),
                    })}
                >
                  <Trash2 size={16} />Remove field
                </button>
              </div>
            ))}
            <button
              className="secondary"
              disabled={fields.length >= 50}
              onClick={() =>
                change("input_schema", {
                  fields: [...fields, {
                    name: `field_${fields.length + 1}`,
                    label: "New field",
                    type: "text",
                    required: false,
                  }],
                })}
            >
              <Plus size={16} />Add field
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="panel-heading">
              <div>
                <h2>Rule builder</h2>
                <p className="muted">
                  Rules run in order. The first match returns its output.
                </p>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  try {
                    if (advanced) applyJson();
                    else {setJson(
                        JSON.stringify(draft.rule_definition, null, 2),
                      );}
                    setAdvanced(!advanced);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Code2 size={16} />
                {advanced ? "Visual builder" : "Advanced JSON"}
              </button>
            </div>
            {advanced
              ? (
                <Suspense fallback={<Loading />}>
                  <AdvancedEditor value={json} onChange={setJson} />
                </Suspense>
              )
              : (
                <>
                  {rules.map((rule, i) => (
                    <div className="rule-card" key={i}>
                      <div className="rule-heading">
                        <strong>{i === 0 ? "IF" : "ELSE IF"}</strong>
                        <label className="inline">
                          Match<select
                            value={rule.match}
                            onChange={(e) => {
                              const r = structuredClone(rules);
                              r[i].match = e.target.value as "AND" | "OR";
                              change("rule_definition", {
                                ...draft.rule_definition,
                                rules: r,
                              });
                            }}
                          >
                            <option>AND</option>
                            <option>OR</option>
                          </select>
                        </label>
                        <button
                          className="icon-button danger-text"
                          aria-label={`Remove rule ${i + 1}`}
                          onClick={() =>
                            change("rule_definition", {
                              ...draft.rule_definition,
                              rules: rules.filter((_, j) => i !== j),
                            })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {rule.conditions.map((cond, j) => (
                        <div className="condition" key={j}>
                          <label>
                            Field<select
                              value={cond.field}
                              onChange={(e) => {
                                const r = structuredClone(rules);
                                r[i].conditions[j].field = e.target.value;
                                change("rule_definition", {
                                  ...draft.rule_definition,
                                  rules: r,
                                });
                              }}
                            >
                              {fields.map((f) => (
                                <option value={f.name} key={f.name}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Operator<select
                              value={cond.operator}
                              onChange={(e) => {
                                const r = structuredClone(rules);
                                r[i].conditions[j].operator = e.target
                                  .value as typeof cond.operator;
                                change("rule_definition", {
                                  ...draft.rule_definition,
                                  rules: r,
                                });
                              }}
                            >
                              {operators.map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          </label>
                          <ValueInput
                            value={cond.value ?? ""}
                            onChange={(v) => {
                              const r = structuredClone(rules);
                              r[i].conditions[j].value = v;
                              change("rule_definition", {
                                ...draft.rule_definition,
                                rules: r,
                              });
                            }}
                          />
                          <button
                            className="icon-button"
                            disabled={rule.conditions.length === 1}
                            aria-label="Remove condition"
                            onClick={() => {
                              const r = structuredClone(rules);
                              r[i].conditions.splice(j, 1);
                              change("rule_definition", {
                                ...draft.rule_definition,
                                rules: r,
                              });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="text-link"
                        disabled={rule.conditions.length >= 20}
                        onClick={() => {
                          const r = structuredClone(rules);
                          r[i].conditions.push({
                            field: fields[0]?.name || "",
                            operator: "==",
                            value: "",
                          });
                          change("rule_definition", {
                            ...draft.rule_definition,
                            rules: r,
                          });
                        }}
                      >
                        + Add condition
                      </button>
                      <div className="return-row">
                        <span>THEN RETURN</span>
                        <ValueInput
                          label="Output"
                          value={rule.output}
                          onChange={(v) => {
                            const r = structuredClone(rules);
                            r[i].output = v;
                            change("rule_definition", {
                              ...draft.rule_definition,
                              rules: r,
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    className="secondary"
                    disabled={rules.length >= 100}
                    onClick={() =>
                      change("rule_definition", {
                        ...draft.rule_definition,
                        rules: [...rules, {
                          conditions: [{
                            field: fields[0]?.name || "",
                            operator: "==",
                            value: "",
                          }],
                          match: "AND",
                          output: "",
                        }],
                      })}
                  >
                    <Plus size={16} />Add rule
                  </button>
                  <div className="default-rule">
                    <strong>ELSE</strong>
                    <ValueInput
                      label="Default output"
                      value={draft.rule_definition.defaultOutput}
                      onChange={(v) =>
                        change("rule_definition", {
                          ...draft.rule_definition,
                          defaultOutput: v,
                        })}
                    />
                  </div>
                </>
              )}
            {error && <ErrorBox error={error} />}
          </>
        )}
        <div className="builder-footer">
          <button
            className="secondary"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} />Back
          </button>
          {step < 2
            ? (
              <button className="primary" onClick={() => setStep(step + 1)}>
                Continue<ArrowRight size={16} />
              </button>
            )
            : (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const candidate = {
                      ...draft,
                      rule_definition: advanced
                        ? applyJson()
                        : draft.rule_definition,
                    };
                    await onSave(BotSchema.parse(candidate));
                  }, "Draft saved.")}
              >
                <Save size={16} />
                {busy ? "Saving…" : "Save bot"}
              </button>
            )}
        </div>
      </div>
    </>
  );
}
