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
import { ExecutionTable, UsageChart } from "./Dashboard";
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
        title="สร้างบอทของคุณ"
        description="เลือกตัวอย่าง กรอกข้อมูล และตั้งเงื่อนไขง่าย ๆ แล้วไปทดลองใช้งานได้เลย"
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
        <Link to="/bots">My bots</Link>
        <span>/</span>
        {bot.name}
      </div>
      <Heading title={bot.name} description={bot.description}>
        <Badge>{bot.status}</Badge>
        <Link className="secondary" to={`/bots/${id}/test`}>
          <Play size={16} />Test bot
        </Link>
        <button
          className="primary"
          disabled={busy || ["BLOCKED", "DISABLED"].includes(bot.status)}
          onClick={() =>
            void run(async () => {
              await api(`studio?id=${id}`, "POST", { action: "publish" });
              setLive(true);
              reload();
            }, "Published successfully.")}
        >
          <Rocket size={16} />
          {busy
            ? "Publishing…"
            : current
            ? "Publish new version"
            : "Publish bot"}
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
            <h2 id="live-title">Your bot is live!</h2>
            <p>
              Versioned logic is ready. Enable the channels you want to share in
              Deploy.
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
            {t[0].toUpperCase() + t.slice(1)}
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
              <Metric label="Total executions" value={bot.run_count} />
              <Metric label="Successful" value={bot.success_count} />
              <Metric label="Failed" value={bot.failure_count} />
              <Metric
                label="Production version"
                value={current ? `v${current.version}` : "Not published"}
              />
            </div>
            <div className="two-col">
              <Panel title="Bot configuration">
                <dl>
                  <dt>Category</dt>
                  <dd>{bot.category}</dd>
                  <dt>Input fields</dt>
                  <dd>{bot.input_schema.fields.length}</dd>
                  <dt>Rules</dt>
                  <dd>{bot.rule_definition.rules.length}</dd>
                  <dt>Updated</dt>
                  <dd>{formatDate(bot.updated_at)}</dd>
                </dl>
                <Link className="secondary" to={`/bots/${id}/builder`}>
                  Edit draft
                </Link>
              </Panel>
              <Panel title="Deployment history">
                {data.deployments.length
                  ? data.deployments.map((d: any) => (
                    <div className="list-row" key={d.id}>
                      <strong>Version {d.version}</strong>
                      <span>{formatDate(d.deployed_at)}</span>
                      <Badge>{d.active ? "LIVE" : "ARCHIVED"}</Badge>
                    </div>
                  ))
                  : (
                    <Empty title="No deployments yet">
                      <p>Test your draft, then publish its first version.</p>
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
      <Panel title="Test input">
        <p className="muted">
          Runs your saved draft through the Edge Function and Rust WASM engine.
        </p>
        <BotForm
          fields={bot.input_schema.fields}
          onRun={async (input) => {
            setResult(null);
            setResult(
              await api("run-bot", "POST", { botId: bot.id, input, admin }),
            );
          }}
          buttonText="Run test"
        />
      </Panel>
      <Panel title="Output">
        {result
          ? (
            <>
              <Badge>SUCCESS</Badge>
              <Output value={result.output} type={bot.output_schema.type} />
              <dl>
                <dt>Execution time</dt>
                <dd>{result.executionTimeMs} ms</dd>
                <dt>WASM memory</dt>
                <dd>{(result.memoryUsed / 1048576).toFixed(2)} MiB</dd>
                <dt>Request ID</dt>
                <dd className="mono">{result.requestId}</dd>
              </dl>
            </>
          )
          : (
            <Empty title="Ready when you are">
              <p>Enter your input and run a test.</p>
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
        <Metric label="Today" value={t.today} />
        <Metric label="Last 7 days" value={t.week} />
        <Metric label="Last 30 days" value={t.month} />
        <Metric label="Total runs" value={t.total} />
        <Metric
          label="Success rate"
          value={t.total ? `${(100 * t.success / t.total).toFixed(1)}%` : "—"}
        />
        <Metric
          label="Failure rate"
          value={t.total ? `${(100 * t.failed / t.total).toFixed(1)}%` : "—"}
        />
        <Metric
          label="Average duration"
          value={`${Number(t.average_ms).toFixed(1)} ms`}
        />
        <Metric
          label="Public / API / Embed"
          value={`${t.public} / ${t.api} / ${t.embed}`}
        />
      </div>
      <Panel title="Usage">
        <UsageChart daily={a.daily} />
      </Panel>
      <Panel title="Top errors">
        {a.errors.length
          ? a.errors.map((e: any) => (
            <div className="list-row" key={e.error_message}>
              <span>{e.error_message || "Unknown error"}</span>
              <Badge>{e.count}</Badge>
            </div>
          ))
          : <Empty title="No errors recorded" />}
      </Panel>
    </>
  );
}
function BotExecutions({ id }: { id: string }) {
  const { data, loading, error } = useResource(
    `studio?resource=executions&bot=${id}`,
  );
  return (
    <Panel title="Recent executions">
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
      <div className="two-col">
        <Panel title="Production deployment">
          <Badge>{deployment ? "LIVE" : "NOT PUBLISHED"}</Badge>
          <h3>
            {deployment
              ? `Version ${deployment.version}`
              : "Publish to create a production version"}
          </h3>
          <p className="muted">
            {deployment
              ? `Published ${formatDate(deployment.deployed_at)}`
              : "Your saved draft can be tested before publishing."}
          </p>
          <p>Editing the builder keeps this published version unchanged.</p>
        </Panel>
        <Panel title="Access channels">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api(`studio?id=${bot.id}`, "PUT", BotSchema.parse(draft));
                reload();
              }, "Access settings saved.");
            }}
          >
            {([
              "allow_public_access",
              "allow_api_access",
              "allow_embed",
            ] as const).map((k, i) => (
              <label className="toggle-row" key={k}>
                {["Public page", "REST API", "Embed widget"][i]}
                <input
                  type="checkbox"
                  checked={draft[k]}
                  onChange={(e) =>
                    setDraft({ ...draft, [k]: e.target.checked })}
                />
              </label>
            ))}
            <label>
              Allowed embed domains<textarea
                placeholder="example.com, shop.example.com"
                value={draft.allowed_domains.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    allowed_domains: e.target.value.split(",").map((s) =>
                      s.trim()
                    ).filter(Boolean),
                  })}
              />
              <small>
                Exact hosts, including port when needed. Empty allows all
                domains.
              </small>
            </label>
            <button className="primary" disabled={busy}>
              <Save size={16} />Save access
            </button>
          </form>
        </Panel>
      </div>
      <Panel
        title="Public page"
        action={bot.allow_public_access && deployment
          ? (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={publicUrl}
            >
              Open bot<ExternalLink size={16} />
            </a>
          )
          : undefined}
      >
        <Code>{publicUrl}</Code>
      </Panel>
      <Panel
        title="REST API"
        action={
          <Link to="/developer/api-keys" className="text-link">
            Manage API keys ↗
          </Link>
        }
      >
        <p className="muted">
          Use your API key from a trusted server. Never expose it in a public
          website.
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
      <Panel title="Embed widget">
        <Code>{embed}</Code>
        <Code>
          {`<script src="${appUrl}/widget.js" data-bot="${bot.public_slug}" data-theme="light"></script>`}
        </Code>
        <p className="muted">
          The script supports parent-origin verification and automatic height
          updates.
        </p>
      </Panel>
    </>
  );
}
function BotSettings({ bot, reload }: { bot: Bot; reload: () => void }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(toDraft(bot));
  const { run, busy } = useAction();
  return (
    <>
      <Panel title="Bot settings">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api(`studio?id=${bot.id}`, "PUT", BotSchema.parse(draft));
              reload();
            }, "Settings saved.");
          }}
        >
          <label>
            Name<input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Description<textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label>
            Requests per minute (per visitor or API key)<input
              type="number"
              min={1}
              max={1000}
              value={draft.rate_limit}
              onChange={(e) =>
                setDraft({ ...draft, rate_limit: Number(e.target.value) })}
            />
            <small>The system rate limit also applies.</small>
          </label>
          <h3>Widget appearance</h3>
          <div className="form-grid">
            {(["title", "buttonText", "placeholder"] as const).map((k) => (
              <label key={k}>
                {k}
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
              Theme<select
                value={draft.widget.theme}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    widget: { ...draft.widget, theme: e.target.value as any },
                  })}
              >
                <option>light</option>
                <option>dark</option>
                <option>system</option>
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
                  ? "Show bot name"
                  : "Show Powered by WasmBot"}
              </label>
            ))}
          </div>
          <button className="primary" disabled={busy}>Save settings</button>
        </form>
      </Panel>
      <WebhookSettings id={bot.id} />
      <Panel title="Bot lifecycle">
        <p className="muted">
          Deleted bots retain their execution and audit history.
        </p>
        <div className="actions">
          <button
            className="secondary"
            disabled={busy || bot.status === "BLOCKED"}
            onClick={() => {
              if (
                confirm(
                  `${bot.status === "DISABLED" ? "Enable" : "Pause"} this bot?`,
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
            {bot.status === "DISABLED" ? "Enable bot" : "Pause bot"}
          </button>
          <button
            className="secondary"
            disabled={busy || !bot.is_published}
            onClick={() => {
              if (
                confirm(
                  "Unpublish this bot? Public, API and embed calls will stop.",
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
            Unpublish
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  `Delete ${bot.name}? This cannot be undone from the dashboard.`,
                )
              ) {
                void run(async () => {
                  await api(`studio?id=${bot.id}`, "DELETE");
                  navigate("/bots");
                });
              }
            }}
          >
            Delete bot
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
    <Panel title="Output webhook">
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} retry={reload} />
        : (
          <>
            <p className="muted">
              Send successful production results to an approved HTTPS
              destination. Requests are signed and retried up to three attempts.
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
                }, "Webhook saved.");
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
                Signing secret<input
                  type="password"
                  autoComplete="new-password"
                  minLength={16}
                  required={!data.webhook}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={data.webhook
                    ? "Leave blank to keep current secret"
                    : "At least 16 characters"}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={enabled ?? data.webhook?.enabled ?? false}
                  onChange={(e) => setEnabled(e.target.checked)}
                />Enable webhook
              </label>
              <div className="actions">
                <button className="primary" disabled={busy}>
                  Save webhook
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !data.webhook}
                  onClick={() =>
                    void run(async () => {
                      await api(`webhooks?bot=${id}&action=retry`, "POST", {});
                      reload();
                    }, "Due deliveries processed.")}
                >
                  Process due retries
                </button>
              </div>
            </form>
            {data.deliveries.length > 0 && (
              <details>
                <summary>Recent deliveries</summary>
                <Json value={data.deliveries} />
              </details>
            )}
          </>
        )}
    </Panel>
  );
}
