import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Code2, Plus, Save, Trash2 } from "lucide-react";
import {
  type BotDraft,
  BotSchema,
  type Field,
  fieldTypes,
  gradeTemplate,
  InputSchema,
  operators,
  RuleSchema,
} from "../../../supabase/functions/_shared/schema";
import { useAction } from "../lib/context";
import { ErrorBox } from "./ui";
const AdvancedEditor = lazy(() => import("./AdvancedEditor"));
const typeLabels: Record<string, string> = {
  text: "ข้อความสั้น",
  number: "ตัวเลข",
  boolean: "ใช่ / ไม่ใช่",
  email: "อีเมล",
  date: "วันที่",
  select: "เลือกจากรายการ",
  textarea: "ข้อความยาว",
  json: "ข้อมูล JSON (ขั้นสูง)",
  message: "ข้อความแจ้งผล",
  table: "ตาราง (ขั้นสูง)",
};
const categoryLabels: Record<string, string> = {
  General: "ทั่วไป",
  Education: "การศึกษา",
  Commerce: "ร้านค้า",
  Validation: "ตรวจสอบข้อมูล",
  Automation: "งานอัตโนมัติ",
  Support: "บริการลูกค้า",
};
const operatorLabels: Record<string, string> = {
  "==": "เท่ากับ",
  "!=": "ไม่เท่ากับ",
  ">": "มากกว่า",
  ">=": "มากกว่าหรือเท่ากับ",
  "<": "น้อยกว่า",
  "<=": "น้อยกว่าหรือเท่ากับ",
  contains: "มีข้อความหรือรายการนี้",
  not_contains: "ไม่มีข้อความหรือรายการนี้",
  starts_with: "ขึ้นต้นด้วย",
  ends_with: "ลงท้ายด้วย",
  is_empty: "ไม่ได้กรอกข้อมูล",
  is_not_empty: "กรอกข้อมูลแล้ว",
};
const thaiGrade: BotDraft = {
  ...gradeTemplate,
  name: "บอทตัดเกรด",
  description: "กรอกคะแนน แล้วให้บอทเลือกเกรดตามเงื่อนไข",
  input_schema: {
    fields: [{ ...gradeTemplate.input_schema.fields[0], label: "คะแนน" }],
  },
};
const shipping: BotDraft = {
  ...gradeTemplate,
  name: "บอทค่าจัดส่ง",
  description: "ยอดซื้อครบ 1,000 บาทส่งฟรี กรุงเทพฯ 40 บาท พื้นที่อื่น 60 บาท",
  category: "Commerce",
  input_schema: {
    fields: [{
      name: "order_total",
      label: "ยอดสั่งซื้อ (บาท)",
      type: "number",
      required: true,
      min: 0,
    }, {
      name: "province",
      label: "จังหวัด",
      type: "select",
      required: true,
      options: ["กรุงเทพฯ", "จังหวัดอื่น"],
    }],
  },
  output_schema: { type: "number" },
  rule_definition: {
    version: 1,
    rules: [{
      conditions: [{ field: "order_total", operator: ">=", value: 1000 }],
      match: "AND",
      output: 0,
    }, {
      conditions: [{ field: "province", operator: "==", value: "กรุงเทพฯ" }],
      match: "AND",
      output: 40,
    }],
    defaultOutput: 60,
  },
};
function emptyValue(type: string): unknown {
  return type === "number"
    ? 0
    : type === "boolean"
    ? false
    : type === "table"
    ? []
    : type === "json"
    ? {}
    : "";
}
function ValueInput(
  { value, onChange, label = "เปรียบเทียบกับ", type = "text", options }: {
    value: unknown;
    onChange: (v: unknown) => void;
    label?: string;
    type?: string;
    options?: string[];
  },
) {
  const structured = type === "json" || type === "table";
  const [text, setText] = useState(JSON.stringify(value) ?? "");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (value !== undefined) {
      setText(JSON.stringify(value) ?? "");
      setInvalid(false);
    }
  }, [value, type]);
  if (type === "boolean") {
    return (
      <label>
        {label}
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) => onChange(e.target.value === "true")}
        >
          <option value="" disabled>เลือกคำตอบ</option>
          <option value="true">ใช่</option>
          <option value="false">ไม่ใช่</option>
        </select>
      </label>
    );
  }
  if (type === "select") {
    return (
      <label>
        {label}
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">เลือกคำตอบ</option>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (structured) {
    return (
      <label>
        {label}
        <textarea
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              setInvalid(false);
              onChange(parsed);
            } catch {
              setInvalid(true);
              onChange(undefined);
            }
          }}
          placeholder={type === "table"
            ? '[{"ชื่อ":"ตัวอย่าง"}]'
            : '{"คำตอบ":"ตัวอย่าง"}'}
        />
        {invalid && (
          <small role="alert">
            รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจวงเล็บและเครื่องหมายคำพูด
          </small>
        )}
      </label>
    );
  }
  return (
    <label>
      {label}
      <input
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        step={type === "number" ? "any" : undefined}
        value={value == null
          ? ""
          : typeof value === "object"
          ? JSON.stringify(value)
          : String(value)}
        onChange={(e) =>
          onChange(
            type === "number"
              ? e.target.value === "" ? undefined : Number(e.target.value)
              : e.target.value,
          )}
        placeholder={type === "number"
          ? "เช่น 1000"
          : "พิมพ์ข้อความได้เลย ไม่ต้องใส่เครื่องหมายคำพูด"}
      />
    </label>
  );
}
export function Builder(
  { initial = thaiGrade, onSave, steps = false }: {
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
  const nextFieldName = () => {
    let n = 1;
    while (fields.some((f) => f.name === `field_${n}`)) n++;
    return `field_${n}`;
  };
  const chooseTemplate = (template: BotDraft) => {
    if (
      JSON.stringify(draft) !== JSON.stringify(initial) &&
      !confirm("เปลี่ยนตัวอย่างจะเขียนทับข้อมูลที่กำลังแก้ไข ต้องการเปลี่ยนหรือไม่?")
    ) return;
    setDraft(structuredClone(template));
    setJson(JSON.stringify(template.rule_definition, null, 2));
    setError("");
  };
  const goTo = (next: number) => {
    setError("");
    if (next > step) {
      if (draft.name.trim().length < 2) {
        setError("กรุณาตั้งชื่อบอทอย่างน้อย 2 ตัวอักษร");
        setStep(0);
        return;
      }
      if (next > 1 && !InputSchema.safeParse(draft.input_schema).success) {
        setError(
          "ตรวจช่องข้อมูล: ต้องมีอย่างน้อย 1 ช่อง ตั้งชื่อให้ครบ ค่าต่ำสุดต้องไม่เกินค่าสูงสุด และช่องแบบรายการต้องมีตัวเลือก",
        );
        setStep(1);
        return;
      }
    }
    setStep(next);
  };
  const applyJson = () => {
    const rule = RuleSchema.parse(JSON.parse(json));
    change("rule_definition", rule);
    return rule;
  };
  return (
    <>
      <div className="builder-steps">
        {[
          "ตั้งชื่อบอท",
          "ข้อมูลที่ต้องกรอก",
          "ตั้งเงื่อนไข",
        ].map((s, i) => (
          <button
            key={s}
            disabled={i > 2}
            className={step === i ? "selected" : ""}
            onClick={() => goTo(i)}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      {steps && (
        <p className="muted">
          ทำ 3 ขั้นตอนนี้ให้ครบ แล้วบันทึกเพื่อไปทดลองใช้งานและเผยแพร่บอท
        </p>
      )}
      <div className="builder-workspace">
        <div className="panel builder">
          {step === 0 && (
            <>
              {initial === thaiGrade && (
                <div className="builder-starters">
                  <p>
                    <strong>เริ่มจากตัวอย่าง แล้วปรับเป็นของคุณ</strong>
                  </p>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => chooseTemplate(thaiGrade)}
                    >
                      🎓 ตัดเกรดจากคะแนน
                    </button>
                    <button
                      className="secondary"
                      onClick={() => chooseTemplate(shipping)}
                    >
                      📦 คิดค่าจัดส่ง
                    </button>
                  </div>
                  <small>ตัวอย่างจะเติมช่องข้อมูลและเงื่อนไขให้ครบ คุณแก้ไขทุกส่วนได้</small>
                </div>
              )}
              <h2>บอทนี้ช่วยทำอะไร?</h2>
              <p className="muted">
                ตั้งชื่อให้จำง่าย เช่น บอทค่าจัดส่ง หรือ บอทตัดเกรด ไม่ต้องเขียนโค้ด
              </p>
              <label>
                ชื่อบอท<input
                  required
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label>
                คำอธิบายสั้น ๆ (ไม่บังคับ)<textarea
                  maxLength={2000}
                  value={draft.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label>
                  หมวดหมู่<select
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
                    ].map((c) => (
                      <option value={c} key={c}>
                        {categoryLabels[c] || c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  อยากให้บอทตอบเป็นอะไร?<select
                    value={draft.output_schema.type}
                    onChange={(e) =>
                      change("output_schema", { type: e.target.value })}
                  >
                    {["text", "number", "boolean", "json", "message", "table"]
                      .map((t) => (
                        <option value={t} key={t}>{typeLabels[t]}</option>
                      ))}
                  </select>
                </label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>อยากให้ผู้ใช้งานกรอกอะไรบ้าง?</h2>
              <p className="muted">
                ช่องเหล่านี้จะปรากฏในแบบฟอร์มของบอท เช่น ยอดสั่งซื้อ จังหวัด หรือคะแนน
                ตั้งชื่อช่องเป็นภาษาไทยได้เลย
              </p>
              {fields.map((f, i) => (
                <div className="field-card" key={i}>
                  <div className="form-grid">
                    <details className="builder-technical">
                      <summary>ข้อมูลสำหรับเชื่อมต่อ API</summary>
                      <p>
                        รหัสช่อง: <code>{f.name}</code> — ระบบตั้งให้แล้ว ไม่ต้องแก้ไข
                      </p>
                    </details>
                    <label>
                      ชื่อช่องที่ผู้ใช้งานจะเห็น<input
                        value={f.label}
                        onChange={(e) =>
                          fieldChange(i, { label: e.target.value })}
                      />
                    </label>
                    <label>
                      ข้อมูลแบบไหน?<select
                        value={f.type}
                        onChange={(e) =>
                          fieldChange(i, {
                            type: e.target.value as Field["type"],
                          })}
                      >
                        {fieldTypes.map((t) => (
                          <option value={t} key={t}>{typeLabels[t]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) =>
                          fieldChange(i, { required: e.target.checked })}
                      />ต้องกรอกช่องนี้
                    </label>
                    {["number", "text", "textarea"].includes(f.type) && (
                      <>
                        <label>
                          {f.type === "number"
                            ? "ค่าต่ำสุด (ไม่บังคับ)"
                            : "จำนวนตัวอักษรขั้นต่ำ (ไม่บังคับ)"}
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
                          {f.type === "number"
                            ? "ค่าสูงสุด (ไม่บังคับ)"
                            : "จำนวนตัวอักษรสูงสุด (ไม่บังคับ)"}
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
                        ตัวเลือก (คั่นแต่ละคำด้วยเครื่องหมาย ,)<input
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
                    disabled={fields.length === 1 ||
                      rules.some((r) =>
                        r.conditions.some((c) => c.field === f.name)
                      )}
                    aria-label={`ลบช่อง ${f.label}`}
                    onClick={() =>
                      change("input_schema", {
                        fields: fields.filter((_, j) => i !== j),
                      })}
                  >
                    <Trash2 size={16} />ลบช่องนี้
                  </button>
                  {rules.some((r) =>
                    r.conditions.some((c) => c.field === f.name)
                  ) && (
                    <small>
                      ช่องนี้ใช้ในเงื่อนไขอยู่ หากต้องการลบ
                      ให้แก้หรือลบเงื่อนไขที่เกี่ยวข้องในขั้นตอนที่ 3 ก่อน
                    </small>
                  )}
                </div>
              ))}
              <button
                className="secondary"
                disabled={fields.length >= 50}
                onClick={() =>
                  change("input_schema", {
                    fields: [...fields, {
                      name: nextFieldName(),
                      label: "ช่องข้อมูลใหม่",
                      type: "text",
                      required: false,
                    }],
                  })}
              >
                <Plus size={16} />เพิ่มช่องข้อมูล
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="panel-heading">
                <div>
                  <h2>ถ้าเจอแบบนี้ ให้ตอบว่าอะไร?</h2>
                  <p className="muted">
                    บอทตรวจจากบนลงล่าง และใช้คำตอบของข้อแรกที่ตรงเงื่อนไข เช่น ยอดซื้อถึง
                    1,000 บาท → ค่าส่ง 0 บาท
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
                      setError(
                        e instanceof SyntaxError
                          ? "JSON ไม่ถูกต้อง กรุณาตรวจวงเล็บและเครื่องหมายคำพูด"
                          : "กฎ JSON ไม่ตรงรูปแบบ กรุณาตรวจชื่อช่อง เงื่อนไข และคำตอบ",
                      );
                    }
                  }}
                >
                  <Code2 size={16} />
                  {advanced ? "กลับมาเลือกเงื่อนไข" : "แก้ JSON (สำหรับผู้เชี่ยวชาญ)"}
                </button>
              </div>
              {advanced
                ? (
                  <Suspense fallback={<p>กำลังเปิดตัวแก้ไข…</p>}>
                    <AdvancedEditor value={json} onChange={setJson} />
                  </Suspense>
                )
                : (
                  <>
                    {rules.map((rule, i) => (
                      <div className="rule-card" key={i}>
                        <div className="rule-heading">
                          <strong>
                            ข้อ {i + 1} · {i === 0 ? "ถ้า" : "ถ้าข้อก่อนหน้าไม่ตรง"}
                          </strong>
                          <label className="inline">
                            เมื่อ<select
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
                              <option value="AND">ตรงทุกเงื่อนไข</option>
                              <option value="OR">ตรงอย่างน้อยหนึ่งเงื่อนไข</option>
                            </select>
                          </label>
                          <button
                            className="icon-button danger-text"
                            aria-label={`ลบข้อ ${i + 1}`}
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
                              เลือกข้อมูล<select
                                value={cond.field}
                                onChange={(e) => {
                                  const r = structuredClone(rules);
                                  r[i].conditions[j].field = e.target.value;
                                  r[i].conditions[j].value = emptyValue(
                                    fields.find((f) =>
                                      f.name === e.target.value
                                    )?.type || "text",
                                  );
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
                              เงื่อนไข<select
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
                                  <option value={o} key={o}>
                                    {operatorLabels[o]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {!["is_empty", "is_not_empty"].includes(
                              cond.operator,
                            ) && (
                              <ValueInput
                                type={fields.find((f) => f.name === cond.field)
                                  ?.type}
                                options={fields.find((f) =>
                                  f.name === cond.field
                                )?.options}
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
                            )}
                            <button
                              className="icon-button"
                              disabled={rule.conditions.length === 1}
                              aria-label="ลบเงื่อนไข"
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
                          + เพิ่มเงื่อนไขในข้อนี้
                        </button>
                        <div className="return-row">
                          <span>ให้บอทตอบ</span>
                          <ValueInput
                            label="คำตอบเมื่อเข้าเงื่อนไข"
                            type={draft.output_schema.type}
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
                            output: emptyValue(draft.output_schema.type),
                          }],
                        })}
                    >
                      <Plus size={16} />เพิ่มข้อถัดไป
                    </button>
                    <div className="default-rule">
                      <strong>ถ้าไม่ตรงกับข้อใดเลย</strong>
                      <ValueInput
                        label="ให้บอทตอบว่า"
                        type={draft.output_schema.type}
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
            </>
          )}
          {error && <ErrorBox error={error} />}
          <div className="builder-footer">
            <button
              className="secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />ย้อนกลับ
            </button>
            {step < 2
              ? (
                <button className="primary" onClick={() => goTo(step + 1)}>
                  ถัดไป<ArrowRight size={16} />
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
                      const checked = BotSchema.safeParse(candidate);
                      if (!checked.success) {
                        setError(
                          "ยังบันทึกไม่ได้: ตรวจชื่อและช่องข้อมูลให้ครบ ค่าที่เปรียบเทียบต้องถูกต้อง และคำตอบทุกข้อรวมถึงคำตอบสำรองต้องตรงกับชนิดคำตอบที่เลือกในขั้นตอนที่ 1",
                        );
                        return;
                      }
                      setError("");
                      await onSave(checked.data);
                    })}
                >
                  <Save size={16} />
                  {busy ? "กำลังบันทึก…" : "บันทึกบอท"}
                </button>
              )}
          </div>
        </div>
        <aside className="builder-companion">
          <span className="section-overline">บอทที่คุณกำลังสร้าง</span>
          <div className="companion-bot-icon">✦</div>
          <h2>{draft.name || "บอทใหม่ของคุณ"}</h2>
          <p>{draft.description || "เล่าว่าบอทนี้ช่วยทำอะไรได้บ้าง"}</p>
          <dl>
            <div>
              <dt>ข้อมูลที่รับ</dt>
              <dd>{fields.length} ช่อง</dd>
            </div>
            <div>
              <dt>เงื่อนไขที่ตั้งไว้</dt>
              <dd>{rules.length} ข้อ</dd>
            </div>
            <div>
              <dt>ตอบกลับเป็น</dt>
              <dd>{typeLabels[draft.output_schema.type]}</dd>
            </div>
          </dl>
          <div className="companion-tip">
            <strong>
              {[
                "เริ่มเล็ก ๆ ก็ช่วยงานได้",
                "ถามเฉพาะข้อมูลที่จำเป็น",
                "ข้อสำคัญ วางไว้ก่อน",
              ][step]}
            </strong>
            <p>
              {[
                "เลือกหนึ่งเรื่องที่ทำบ่อย เช่น ตัดเกรดหรือคิดค่าจัดส่ง แล้วค่อยเพิ่มเงื่อนไขภายหลัง",
                "ใช้ชื่อช่องที่ผู้ใช้อ่านแล้วเข้าใจ เช่น ยอดสั่งซื้อ (บาท) และกำหนดว่าช่องไหนต้องกรอก",
                "บอทใช้คำตอบของข้อแรกที่ตรงเงื่อนไข อย่าลืมตั้งคำตอบสำรองสำหรับกรณีอื่นด้วย",
              ][step]}
            </p>
          </div>
          <small>บันทึกก่อน แล้วทดลองกับข้อมูลจริงในขั้นตอนถัดไป</small>
        </aside>
      </div>
    </>
  );
}
