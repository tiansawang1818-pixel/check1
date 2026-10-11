import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Field } from "../../../supabase/functions/_shared/schema";
import { validateInput } from "../../../supabase/functions/_shared/schema";
import { ErrorBox, Json } from "./ui";
export function BotForm(
  { fields, onRun, buttonText = "รันบอท", placeholder = "" }: {
    fields: Field[];
    onRun: (value: Record<string, unknown>) => Promise<void>;
    buttonText?: string;
    placeholder?: string;
  },
) {
  const [values, setValues] = useState<Record<string, unknown>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  const set = (f: Field, v: unknown) =>
    setValues((x) => ({ ...x, [f.name]: v }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setError("");
        setBusy(true);
        try {
          const input: Record<string, unknown> = Object.fromEntries(
            fields.filter((f) => values[f.name] !== undefined).map((f) => [f.name, values[f.name]]),
          );
          for (const f of fields) {
            if (
              f.type === "json" && typeof input[f.name] === "string" &&
              input[f.name] !== ""
            ) {
              try { input[f.name] = JSON.parse(input[f.name] as string); }
              catch { throw new Error(`${f.label}: กรุณากรอก JSON ให้ถูกต้อง`); }
            }
            if (f.type === "boolean" && input[f.name] === undefined) {
              input[
                f.name
              ] = false;
            }
          }
          validateInput({ fields }, input);
          await onRun(input);
        } catch (e) {
          setError(e instanceof Error ? e.message : "รันบอทไม่สำเร็จ กรุณาลองใหม่");
        } finally {
          inFlight.current = false;
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.required && <span className="required">*</span>}
          {f.type === "boolean"
            ? (
              <input
                type="checkbox"
                checked={Boolean(values[f.name])}
                onChange={(e) => set(f, e.target.checked)}
              />
            )
            : f.type === "select"
            ? (
              <select
                required={f.required}
                value={String(values[f.name] ?? "")}
                onChange={(e) => set(f, e.target.value)}
              >
                <option value="">เลือกตัวเลือก</option>
                {f.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            )
            : ["textarea", "json"].includes(f.type)
            ? (
              <textarea
                required={f.required}
                placeholder={f.type === "json"
                  ? '{"key": "value"}'
                  : placeholder}
                value={String(values[f.name] ?? "")}
                onChange={(e) => set(f, e.target.value)}
              />
            )
            : (
              <input
                type={f.type === "number"
                  ? "number"
                  : f.type === "email"
                  ? "email"
                  : f.type === "date"
                  ? "date"
                  : "text"}
                step={f.type === "number" ? "any" : undefined}
                min={f.type === "number" ? f.min : undefined}
                max={f.type === "number" ? f.max : undefined}
                minLength={f.type !== "number" ? f.min : undefined}
                maxLength={f.type !== "number" ? f.max : undefined}
                required={f.required}
                placeholder={placeholder}
                value={String(values[f.name] ?? "")}
                onChange={(e) =>
                  set(
                    f,
                    f.type === "number" && e.target.value !== ""
                      ? Number(e.target.value)
                      : e.target.value,
                  )}
              />
            )}
        </label>
      ))}
      {error && <ErrorBox error={error} />}
      <button disabled={busy} className="primary" type="submit">
        <Play size={16} />
        {busy ? "กำลังรัน…" : buttonText}
      </button>
    </form>
  );
}
export function Output(
  { value, type = "json" }: { value: unknown; type?: string },
) {
  if (
    type === "table" && Array.isArray(value) && value.length &&
    value.every((row) => row && typeof row === "object" && !Array.isArray(row))
  ) {
    const keys = Object.keys(value[0]);
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{keys.map((k) => <th key={k}>{k}</th>)}</tr>
          </thead>
          <tbody>
            {value.map((r, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k}>
                    {typeof r[k] === "object"
                      ? JSON.stringify(r[k])
                      : String(r[k] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (value === null || typeof value === "object") {
    return <Json value={value} />;
  }
  return <div className="output-value">{String(value)}</div>;
}
