import { useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { Check, ExternalLink, Play, Rocket, Save } from "lucide-react";
import { api, apiUrl, appUrl } from "../lib/api";
import { useAction, useResource } from "../lib/context";
import {
  type Bot,
  type BotDraft,
  BotSchema,
} from "../../../supabase/functions/_shared/schema";
import { Builder } from "../components/Builder";
import { BotForm, Output } from "../components/BotForm";
import {
  Badge,
  Code,
  Empty,
  ErrorBox,
  formatDate,
  Heading,
  Json,
  Loading,
  Metric,
  Panel,
} from "../components/ui";
import { categoryLabel, ExecutionTable, UsageChart } from "./Dashboard";
const draftKeys = [
  "name",
  "description",
  "category",
  "input_schema",
  "output_schema",
  "rule_definition",
  "allow_public_access",
  "allow_api_access",
  "allow_embed",
  "allowed_domains",
  "widget",
  "rate_limit",
];
export const toDraft = (bot: Bot): BotDraft =>
  BotSchema.parse(
    Object.fromEntries(draftKeys.map((k) => [k, (bot as any)[k]])),
  );
export function NewBot() {
  const navigate = useNavigate();
  return (
    <>
      <Heading
        eyebrow="สร้างบอทได้โดยไม่ต้องเขียนโค้ด"
        title="สร้างบอท"
        description="กำหนดชื่อ ข้อมูลที่รับ และเงื่อนไขการตอบกลับ"
      />
      <Builder
        steps
        onSave={async (draft) => {
          const { bot } = await api("studio", "POST", draft);
          navigate(`/bots/${bot.id}/test`);
        }}
      />
    </>
  );
}
export function BotDetail() {
  const { id } = useParams();
  return <BotDetailPage key={id} />;
}
function BotDetailPage() {
  const { id, tab = "overview" } = useParams();
  const { data, loading, error, reload } = useResource(`studio?id=${id}`);
  const { busy, run } = useAction();
  const [live, setLive] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const bot: Bot = data.bot;
  const current = data.deployments.find((d: any) => d.active);
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/bots">บอทของฉัน</Link>
        <span>/</span>
        {bot.name}
      </div>
      <Heading title={bot.name} description={bot.description}>
        <Badge>{bot.status}</Badge>
        <Link className="secondary" to={`/bots/${id}/test`}>
          <Play size={16} />ทดสอบบอท
        </Link>
        <button
          className="primary"
          disabled={busy || ["BLOCKED", "DISABLED"].includes(bot.status)}
          onClick={() =>
            void run(async () => {
              await api(`studio?id=${id}`, "POST", { action: "publish" });
              setLive(true);
              reload();
            }, "เผยแพร่เรียบร้อยแล้ว")}
        >
          <Rocket size={16} />
          {busy
            ? "กำลังเผยแพร่…"
            : current
            ? "เผยแพร่เวอร์ชันใหม่"
            : "เผยแพร่บอท"}
        </button>
      </Heading>
      {live && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-title"
          className="modal-backdrop"
        >
          <section className="modal">
            <Check className="success-icon" size={36} />
            <h2 id="live-title">เผยแพร่บอทแล้ว!</h2>
            <p>
              สร้างเวอร์ชันใช้งานจริงแล้ว เลือกเปิดช่องทางที่ต้องการในหน้าการเผยแพร่
            </p>
            <Code>{`${appUrl}/b/${bot.public_slug}`}</Code>
            <div className="actions">
              <Link
                className="primary"
                to={`/bots/${id}/deploy`}
                onClick={() => setLive(false)}
              >
                View deployment
              </Link>
              <Link className="secondary" to="/developer/api-keys">
                Create API key
              </Link>
              <button className="secondary" onClick={() => setLive(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
      <nav className="tabs">
        {[
          "overview",
          "builder",
          "test",
          "deploy",
          "executions",
          "analytics",
          "settings",
        ].map((t) => (
          <NavLink
            key={t}
            end
            to={`/bots/${id}/${t}`}
            className={() => tab === t ? "active" : ""}
          >
            {{ overview: "ภาพรวม", builder: "แก้ไขบอท", test: "ทดสอบ", deploy: "เผยแพร่", executions: "ประวัติการรัน", analytics: "สถิติ", settings: "ตั้งค่า" }[t]}
          </NavLink>
        ))}
      </nav>
      {tab === "builder"
        ? (
          <Builder
            initial={toDraft(bot)}
            onSave={async (draft) => {
              await api(`studio?id=${id}`, "PUT", draft);
              reload();
            }}
          />
        )
        : tab === "test"
        ? <Playground bot={bot} />
        : tab === "deploy"
        ? <Deploy bot={bot} deployment={current} reload={reload} />
        : tab === "settings"
        ? <BotSettings bot={bot} reload={reload} />
        : tab === "analytics"
        ? <Analytics botId={id!} />
        : tab === "executions"
        ? <BotExecutions id={id!} />
        : (
          <>
            <div className="metrics">
              <Metric label="การทำงานทั้งหมด" value={bot.run_count} />
              <Metric label="สำเร็จ" value={bot.success_count} />
              <Metric label="ผิดพลาด" value={bot.failure_count} />
              <Metric
                label="เวอร์ชันใช้งานจริง"
                value={current ? `v${current.version}` : "ยังไม่เผยแพร่"}
              />
            </div>
            <div className="two-col">
              <Panel title="ข้อมูลบอท">
                <dl>
                  <dt>หมวดหมู่</dt>
                  <dd>{categoryLabel(bot.category)}</dd>
                  <dt>ช่องข้อมูลรับเข้า</dt>
                  <dd>{bot.input_schema.fields.length}</dd>
                  <dt>เงื่อนไข</dt>
                  <dd>{bot.rule_definition.rules.length}</dd>
                  <dt>แก้ไขล่าสุด</dt>
                  <dd>{formatDate(bot.updated_at)}</dd>
                </dl>
                <Link className="secondary" to={`/bots/${id}/builder`}>
                  แก้ไขฉบับร่าง
                </Link>
              </Panel>
              <Panel title="ประวัติการเผยแพร่">
                {data.deployments.length
                  ? data.deployments.map((d: any) => (
                    <div className="list-row" key={d.id}>
                      <strong>เวอร์ชัน {d.version}</strong>
                      <span>{formatDate(d.deployed_at)}</span>
                      <Badge>{d.active ? "LIVE" : "ARCHIVED"}</Badge>
                    </div>
                  ))
                  : (
                    <Empty title="ยังไม่มีเวอร์ชันที่เผยแพร่">
                      <p>ทดลองฉบับร่างให้เรียบร้อย แล้วเผยแพร่เวอร์ชันแรก</p>
                    </Empty>
                  )}
              </Panel>
            </div>
            <BotExecutions id={id!} />
          </>
        )}
    </>
  );
}
export function Playground(
  { bot, admin = false }: { bot: Bot; admin?: boolean },
) {
  const [result, setResult] = useState<any>(null);
  return (
    <div className="two-col">
      <Panel title="ข้อมูลสำหรับทดสอบ">
        <p className="muted">
          ทดลองใช้ฉบับร่างที่บันทึกไว้ โดยไม่เปลี่ยนเวอร์ชันที่เผยแพร่
        </p>
        <BotForm
          fields={bot.input_schema.fields}
          onRun={async (input) => {
            setResult(null);
            setResult(
              await api("run-bot", "POST", { botId: bot.id, input, admin }),
            );
          }}
          buttonText="เริ่มทดสอบ"
        />
      </Panel>
      <Panel title="ผลลัพธ์">
        {result
          ? (
            <>
              <Badge>SUCCESS</Badge>
              <Output value={result.output} type={bot.output_schema.type} />
              <dl>
                <dt>เวลาประมวลผล</dt>
                <dd>{result.executionTimeMs} ms</dd>
                <dt>หน่วยความจำ WASM</dt>
                <dd>{(result.memoryUsed / 1048576).toFixed(2)} MiB</dd>
                <dt>รหัสคำขอ</dt>
                <dd className="mono">{result.requestId}</dd>
              </dl>
            </>
          )
          : (
            <Empty title="พร้อมให้คุณทดลองแล้ว">
              <p>กรอกข้อมูลแล้วกดเริ่มทดสอบ</p>
            </Empty>
          )}
      </Panel>
    </div>
  );
}
export function Analytics({ botId }: { botId?: string }) {
  const { data, loading, error, reload } = useResource(
    `studio?resource=analytics${botId ? `&id=${botId}` : ""}`,
  );
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const a = data.analytics, t = a.totals;
  return (
    <>
      <div className="metrics">
        <Metric label="วันนี้" value={t.today} />
        <Metric label="7 วันที่ผ่านมา" value={t.week} />
        <Metric label="30 วันที่ผ่านมา" value={t.month} />
        <Metric label="การทำงานทั้งหมด" value={t.total} />
        <Metric
          label="อัตราสำเร็จ"
          value={t.total ? `${(100 * t.success / t.total).toFixed(1)}%` : "—"}
        />
        <Metric
          label="อัตราผิดพลาด"
          value={t.total ? `${(100 * t.failed / t.total).toFixed(1)}%` : "—"}
        />
        <Metric
          label="เวลาประมวลผลเฉลี่ย"
          value={`${Number(t.average_ms).toFixed(1)} ms`}
        />
        <Metric
          label="ลิงก์ / API / ฝังเว็บ"
          value={`${t.public} / ${t.api} / ${t.embed}`}
        />
      </div>
      <Panel title="การใช้งาน">
        <UsageChart daily={a.daily} />
      </Panel>
      <Panel title="ข้อผิดพลาดที่พบบ่อย">
        {a.errors.length
          ? a.errors.map((e: any) => (
            <div className="list-row" key={e.error_message}>
              <span>{e.error_message || "ไม่ทราบสาเหตุ"}</span>
              <Badge>{e.count}</Badge>
            </div>
          ))
          : <Empty title="ยังไม่พบข้อผิดพลาด" />}
      </Panel>
    </>
  );
}
function BotExecutions({ id }: { id: string }) {
  const { data, loading, error } = useResource(
    `studio?resource=executions&bot=${id}`,
  );
  return (
    <Panel title="การทำงานล่าสุด">
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} />
        : <ExecutionTable rows={data.executions} />}
    </Panel>
  );
}
export function examples(slug: string, input: unknown) {
  const endpoint = `${apiUrl}/api-run`;
  const payload = JSON.stringify({ bot: slug, input }, null, 2);
  return {
    curl:
      `curl -X POST '${endpoint}' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '${
        payload.replaceAll("'", "'\\''")
      }'`,
    javascript:
      `const response = await fetch('${endpoint}', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${payload})\n});\nconst result = await response.json();\nconsole.log(result);`,
    python:
      `import requests\nimport json\n\nresponse = requests.post(\n    '${endpoint}',\n    headers={'Authorization': 'Bearer YOUR_API_KEY'},\n    json=json.loads(${
        JSON.stringify(payload)
      })\n)\nresponse.raise_for_status()\nprint(response.json())`,
  };
}
function Deploy(
  { bot, deployment, reload }: {
    bot: Bot;
    deployment: any;
    reload: () => void;
  },
) {
  const [draft, setDraft] = useState(toDraft(bot)),
    [domains, setDomains] = useState(bot.allowed_domains.join(", ")),
    [example, setExample] = useState<"curl" | "javascript" | "python">("curl");
  const { busy, run } = useAction();
  const input = Object.fromEntries(
    (deployment?.input_schema_snapshot ?? bot.input_schema).fields.map((
      f: any,
    ) => [
      f.name,
      f.type === "number"
        ? f.min ?? 0
        : f.type === "boolean"
        ? false
        : f.type === "json"
        ? {}
        : f.options?.[0] ?? "example",
    ]),
  );
  const code = examples(bot.public_slug, input);
  const publicUrl = `${appUrl}/b/${bot.public_slug}`,
    embed =
      `<iframe src="${appUrl}/embed/${bot.public_slug}" width="400" height="500" title="WasmBot widget" style="border:0;border-radius:16px" loading="lazy"></iframe>`;
  return (
    <>
      <Panel title="ให้คนอื่นใช้บอทของคุณใน 3 ขั้นตอน">
        <ol className="publish-steps">
          <li><Link to={`/bots/${bot.id}/test`}>ทดลองกรอกข้อมูล</Link> แล้วตรวจว่าคำตอบถูกต้อง</li>
          <li>กด “เผยแพร่บอท” ด้านบน เพื่อเลือกฉบับที่พร้อมใช้งาน</li>
          <li>เปิด “ให้ผู้อื่นใช้ผ่านลิงก์” แล้วกดบันทึก จากนั้นคัดลอกลิงก์ส่งให้ผู้ใช้งาน</li>
        </ol>
        <p className="muted">การใช้งานผ่านลิงก์ไม่ต้องเขียนโค้ดหรือตั้งค่ากุญแจ API</p>
      </Panel>
      <div className="two-col">
        <Panel title="เวอร์ชันสำหรับใช้งานจริง">
          <Badge>{deployment ? "LIVE" : "NOT_PUBLISHED"}</Badge>
          <h3>
            {deployment
              ? `เวอร์ชัน ${deployment.version}`
              : "ยังไม่ได้เผยแพร่บอท"}
          </h3>
          <p className="muted">
            {deployment
              ? `เผยแพร่เมื่อ ${formatDate(deployment.deployed_at)}`
              : "คุณทดลองใช้ฉบับร่างได้ก่อนเปิดให้ผู้อื่นใช้งาน"}
          </p>
          <p>เมื่อแก้ไขบอท ให้กดเผยแพร่เวอร์ชันใหม่อีกครั้ง ผู้ใช้จึงจะเห็นการเปลี่ยนแปลง</p>
        </Panel>
        <Panel title="ช่องทางใช้งาน">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api(`studio?id=${bot.id}`, "PUT", BotSchema.parse({
                  ...draft,
                  allowed_domains: domains.split(/[,\n]/).map((domain) => domain.trim()).filter(Boolean),
                }));
                reload();
              }, "บันทึกช่องทางใช้งานแล้ว");
            }}
          >
            <label className="toggle-row">
              ให้ผู้อื่นใช้ผ่านลิงก์
              <input type="checkbox" checked={draft.allow_public_access}
                onChange={(e) => setDraft({ ...draft, allow_public_access: e.target.checked })} />
            </label>
            <p className="muted">เมื่อเปิด ทุกคนที่มีลิงก์สามารถกรอกข้อมูลและรันบอทได้</p>
            <details>
              <summary>ตัวเลือกขั้นสูง: เชื่อมแอปหรือฝังในเว็บไซต์</summary>
            {([
              "allow_api_access",
              "allow_embed",
            ] as const).map((k, i) => (
              <label className="toggle-row" key={k}>
                {["เชื่อมต่อแอปผ่าน API", "ฝังบอทในเว็บไซต์"][i]}
                <input
                  type="checkbox"
                  checked={draft[k]}
                  onChange={(e) =>
                    setDraft({ ...draft, [k]: e.target.checked })}
                />
              </label>
            ))}
            <label>
              โดเมนที่อนุญาตให้ฝังบอท<textarea
                placeholder="example.com, shop.example.com"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
              />
              <small>
                คั่นแต่ละโดเมนด้วยจุลภาคหรือขึ้นบรรทัดใหม่ ระบุพอร์ตหากจำเป็น เว้นว่างเพื่ออนุญาตทุกโดเมน
              </small>
            </label>
            </details>
            <button className="primary" disabled={busy}>
              <Save size={16} />บันทึกช่องทางใช้งาน
            </button>
          </form>
        </Panel>
      </div>
      <Panel
        title="ลิงก์สำหรับผู้ใช้งาน"
        action={bot.allow_public_access && deployment
          ? (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={publicUrl}
            >
              เปิดหน้าบอท<ExternalLink size={16} />
            </a>
          )
          : undefined}
      >
        {bot.allow_public_access && deployment
          ? <><Code>{publicUrl}</Code>{["localhost", "127.0.0.1", "[::1]"].includes(new URL(appUrl).hostname) &&
            <p className="notice">ขณะนี้เว็บเปิดบนเครื่องของคุณ ลิงก์นี้ยังส่งให้คนอื่นเปิดจากเครื่องอื่นไม่ได้ ต้องนำเว็บขึ้นออนไลน์ก่อน</p>}</>
          : <p>ลิงก์จะพร้อมเมื่อเผยแพร่บอท และเปิดให้ผู้อื่นใช้ผ่านลิงก์พร้อมบันทึกแล้ว</p>}
      </Panel>
      <details>
        <summary>สำหรับผู้พัฒนา: ตัวอย่างโค้ด API และการฝังบอท</summary>
      <Panel
        title="REST API"
        action={
          <Link to="/developer/api-keys" className="text-link">
            จัดการกุญแจ API ↗
          </Link>
        }
      >
        <p className="muted">
          ใช้กุญแจ API บนเซิร์ฟเวอร์ที่เชื่อถือได้ และห้ามใส่กุญแจไว้ในเว็บไซต์สาธารณะ
        </p>
        <div className="tabs">
          {(["curl", "javascript", "python"] as const).map((t) => (
            <button
              className={example === t ? "active" : ""}
              key={t}
              onClick={() => setExample(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <Code>{code[example]}</Code>
      </Panel>
      <Panel title="โค้ดฝังบอทในเว็บไซต์">
        <Code>{embed}</Code>
        <Code>
          {`<script src="${appUrl}/widget.js" data-bot="${bot.public_slug}" data-theme="light"></script>`}
        </Code>
        <p className="muted">
          สคริปต์ตรวจสอบโดเมนต้นทางและปรับความสูงให้พอดีโดยอัตโนมัติ
        </p>
      </Panel>
      </details>
    </>
  );
}
function BotSettings({ bot, reload }: { bot: Bot; reload: () => void }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(toDraft(bot));
  const { run, busy } = useAction();
  return (
    <>
      <Panel title="ตั้งค่าบอท">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api(`studio?id=${bot.id}`, "PUT", BotSchema.parse(draft));
              reload();
            }, "บันทึกการตั้งค่าแล้ว");
          }}
        >
          <label>
            ชื่อบอท<input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            คำอธิบาย<textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label>
            จำนวนครั้งที่ใช้ได้ต่อนาที (ต่อผู้ใช้)<input
              type="number"
              min={1}
              max={1000}
              value={draft.rate_limit}
              onChange={(e) =>
                setDraft({ ...draft, rate_limit: Number(e.target.value) })}
            />
            <small>ใช้ป้องกันการเรียกบอทถี่เกินไป โดยยังมีขีดจำกัดรวมของระบบ</small>
          </label>
          <h3>หน้าตาที่ผู้ใช้งานจะเห็น</h3>
          <div className="form-grid">
            {(["title", "buttonText", "placeholder"] as const).map((k) => (
              <label key={k}>
                {{ title: "หัวข้อที่แสดง", buttonText: "ข้อความบนปุ่มรัน", placeholder: "ตัวอย่างในช่องกรอก" }[k]}
                <input
                  value={draft.widget[k]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      widget: { ...draft.widget, [k]: e.target.value },
                    })}
                />
              </label>
            ))}
            <label>
              โทนสี<select
                value={draft.widget.theme}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    widget: { ...draft.widget, theme: e.target.value as any },
                  })}
              >
                <option value="light">สว่าง</option>
                <option value="dark">มืด</option>
                <option value="system">ตามอุปกรณ์</option>
              </select>
            </label>
            {(["showBotName", "showPoweredBy"] as const).map((k) => (
              <label key={k} className="check-label">
                <input
                  type="checkbox"
                  checked={draft.widget[k]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      widget: { ...draft.widget, [k]: e.target.checked },
                    })}
                />
                {k === "showBotName"
                  ? "แสดงชื่อบอท"
                  : "แสดงเครดิต WasmBot"}
              </label>
            ))}
          </div>
          <button className="primary" disabled={busy}>บันทึกการตั้งค่า</button>
        </form>
      </Panel>
      <details><summary>ขั้นสูง: ส่งผลลัพธ์ไปยังระบบอื่น (Webhook)</summary><WebhookSettings id={bot.id} /></details>
      <Panel title="พักหรือหยุดให้บริการบอท">
        <p className="muted">
          เมื่อลบบอท ประวัติการรันยังถูกเก็บไว้ แต่ไม่สามารถกู้คืนบอทจากหน้านี้ได้
        </p>
        <div className="actions">
          <button
            className="secondary"
            disabled={busy || bot.status === "BLOCKED"}
            onClick={() => {
              if (
                confirm(
                  `${bot.status === "DISABLED" ? "เปิดใช้งาน" : "พักการทำงาน"}บอทนี้?`,
                )
              ) {
                void run(async () => {
                  await api(`studio?id=${bot.id}`, "POST", {
                    action: "status",
                    status: bot.status === "DISABLED" ? "ACTIVE" : "DISABLED",
                  });
                  reload();
                });
              }
            }}
          >
            {bot.status === "DISABLED" ? "เปิดใช้งานบอท" : "พักการทำงาน"}
          </button>
          <button
            className="secondary"
            disabled={busy || !bot.is_published}
            onClick={() => {
              if (
                confirm(
                  "ยกเลิกการเผยแพร่? ผู้ใช้จะรันบอทผ่านลิงก์ API หรือเว็บไซต์ที่ฝังบอทไม่ได้",
                )
              ) {
                void run(async () => {
                  await api(`studio?id=${bot.id}`, "POST", {
                    action: "unpublish",
                  });
                  reload();
                });
              }
            }}
          >
            ยกเลิกการเผยแพร่
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  `ลบบอท ${bot.name}? คุณจะกู้คืนบอทจากหน้านี้ไม่ได้`,
                )
              ) {
                void run(async () => {
                  await api(`studio?id=${bot.id}`, "DELETE");
                  navigate("/bots");
                });
              }
            }}
          >
            ลบบอท
          </button>
        </div>
      </Panel>
    </>
  );
}
function WebhookSettings({ id }: { id: string }) {
  const { data, loading, error, reload } = useResource(`webhooks?bot=${id}`);
  const { run, busy } = useAction();
  const [url, setUrl] = useState<string | null>(null),
    [secret, setSecret] = useState(""),
    [enabled, setEnabled] = useState<boolean | null>(null);
  return (
    <Panel title="ส่งผลลัพธ์ด้วย Webhook">
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} retry={reload} />
        : (
          <>
            <p className="muted">
              ส่งผลลัพธ์ที่สำเร็จไปยังปลายทาง HTTPS ที่อนุญาต คำขอจะมีลายเซ็น
              และลองส่งซ้ำได้สูงสุดสามครั้ง
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api(`webhooks?bot=${id}`, "PUT", {
                    url: url ?? data.webhook?.url ?? "",
                    secret: secret || undefined,
                    enabled: enabled ?? data.webhook?.enabled ?? false,
                  });
                  setSecret("");
                  reload();
                }, "บันทึก Webhook แล้ว");
              }}
            >
              <label>
                Webhook URL<input
                  type="url"
                  required
                  value={url ?? data.webhook?.url ?? ""}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <label>
                รหัสลับสำหรับลงลายเซ็น<input
                  type="password"
                  autoComplete="new-password"
                  minLength={16}
                  required={!data.webhook}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={data.webhook
                    ? "เว้นว่างเพื่อใช้รหัสเดิม"
                    : "อย่างน้อย 16 ตัวอักษร"}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={enabled ?? data.webhook?.enabled ?? false}
                  onChange={(e) => setEnabled(e.target.checked)}
                />เปิดใช้งาน Webhook
              </label>
              <div className="actions">
                <button className="primary" disabled={busy}>
                  บันทึก Webhook
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !data.webhook}
                  onClick={() =>
                    void run(async () => {
                      await api(`webhooks?bot=${id}&action=retry`, "POST", {});
                      reload();
                    }, "ประมวลผลรายการที่รอส่งซ้ำแล้ว")}
                >
                  ส่งรายการที่ค้างอีกครั้ง
                </button>
              </div>
            </form>
            {data.deliveries.length > 0 && (
              <details>
                <summary>รายการส่งล่าสุด</summary>
                <Json value={data.deliveries} />
              </details>
            )}
          </>
        )}
    </Panel>
  );
}
