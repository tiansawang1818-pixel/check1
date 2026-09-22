import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Plus } from "lucide-react";
import { api, apiUrl, supabase } from "../lib/api";
import { useAction, useAuth, useResource } from "../lib/context";
import {
  Badge,
  Code,
  CopyButton,
  Empty,
  ErrorBox,
  formatDate,
  Heading,
  Loading,
  Panel,
} from "../components/ui";
import { examples } from "./BotDetail";
export function ApiKeys() {
  const { data, loading, error, reload } = useResource("api-keys"),
    bots = useResource("studio");
  const { busy, run } = useAction();
  const [name, setName] = useState(""),
    [scopes, setScopes] = useState(["bot:run"]),
    [allowed, setAllowed] = useState<string[]>([]),
    [all, setAll] = useState(true),
    [key, setKey] = useState(""),
    [create, setCreate] = useState(false);
  return (
    <>
      <Heading
        eyebrow="DEVELOPER"
        title="API keys"
        description="Give your applications scoped access to your bots."
      >
        <button className="primary" onClick={() => setCreate(!create)}>
          <Plus size={17} />Create API key
        </button>
      </Heading>
      {key && (
        <Panel title="Copy your API key now">
          <p>
            You will not be able to see it again. Keep it on a trusted server.
          </p>
          <Code>{key}</Code>
          <button className="secondary" onClick={() => setKey("")}>
            I have saved this key
          </button>
        </Panel>
      )}
      {create && (
        <Panel title="Create a key">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await api("api-keys", "POST", {
                  name,
                  scopes,
                  allowed_bot_ids: all ? null : allowed,
                });
                setKey(r.key);
                setCreate(false);
                setName("");
                reload();
              }, "API key created.");
            }}
          >
            <label>
              Name<input
                required
                maxLength={100}
                placeholder="Production application"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              {["bot:run", "bot:read", "execution:read"].map((s) => (
                <label className="check-label" key={s}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={(e) =>
                      setScopes(
                        e.target.checked
                          ? [...scopes, s]
                          : scopes.filter((v) =>
                            v !== s
                          ),
                      )}
                  />
                  {s}
                </label>
              ))}
            </fieldset>
            <label className="check-label">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAll(e.target.checked)}
              />All my bots
            </label>
            {!all && (bots.loading
              ? <Loading />
              : bots.error
              ? <ErrorBox error={bots.error} />
              : bots.data.bots.map((b: any) => (
                <label className="check-label" key={b.id}>
                  <input
                    type="checkbox"
                    checked={allowed.includes(b.id)}
                    onChange={(e) =>
                      setAllowed(
                        e.target.checked
                          ? [...allowed, b.id]
                          : allowed.filter((v) =>
                            v !== b.id
                          ),
                      )}
                  />
                  {b.name}
                </label>
              )))}
            <button
              className="primary"
              disabled={busy || !scopes.length || !all && !allowed.length}
            >
              Generate key
            </button>
          </form>
        </Panel>
      )}
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} retry={reload} />
        : (
          <Panel>
            {data.keys.length
              ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Key</th>
                        <th>Scope</th>
                        <th>Usage</th>
                        <th>Last used</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.keys.map((k: any) => (
                        <tr key={k.id}>
                          <td>
                            <strong>{k.name}</strong>
                            <small>{formatDate(k.created_at)}</small>
                          </td>
                          <td>
                            <code>{k.key_prefix}…</code>
                          </td>
                          <td>{k.scopes.join(", ")}</td>
                          <td>{k.usage_count}</td>
                          <td>
                            {k.last_used_at
                              ? formatDate(k.last_used_at)
                              : "Never"}
                          </td>
                          <td>
                            <Badge>{k.revoked_at ? "REVOKED" : "ACTIVE"}</Badge>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="text-link"
                                disabled={busy}
                                onClick={() => {
                                  const name = prompt("New key name", k.name);
                                  if (name) {
                                    void run(async () => {
                                      await api(
                                        `api-keys?id=${k.id}`,
                                        "PATCH",
                                        { name },
                                      );
                                      reload();
                                    });
                                  }
                                }}
                              >
                                Rename
                              </button>
                              <button
                                className="text-link"
                                disabled={busy || Boolean(k.revoked_at)}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Revoke ${k.name}? Applications using it will stop working.`,
                                    )
                                  ) {
                                    void run(async () => {
                                      await api(`api-keys?id=${k.id}`, "POST", {
                                        action: "revoke",
                                      });
                                      reload();
                                    });
                                  }
                                }}
                              >
                                Revoke
                              </button>
                              <button
                                className="danger-text"
                                disabled={busy}
                                onClick={() => {
                                  if (confirm(`Delete ${k.name}?`)) {
                                    void run(async () => {
                                      await api(
                                        `api-keys?id=${k.id}`,
                                        "DELETE",
                                      );
                                      reload();
                                    });
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              : (
                <Empty title="No API keys">
                  <KeyRound />
                  <p>Create a key to call your bots from an application.</p>
                </Empty>
              )}
          </Panel>
        )}
    </>
  );
}
export function Developer() {
  const sample = examples("grade-calculator-a82f", { score: 85 });
  return (
    <>
      <Heading
        eyebrow="DEVELOPER RESOURCES"
        title="Connect your bots"
        description="Run the same published logic across your products."
      >
        <Link className="primary" to="/developer/api-keys">
          <KeyRound size={16} />Manage API keys
        </Link>
      </Heading>
      <div className="docs-grid">
        <div>
          <Panel title="1. Authenticate">
            <p>
              Create an API key with the <code>bot:run</code>{" "}
              permission. Keys are scoped to your account and optionally to
              selected bots.
            </p>
            <Code>{"Authorization: Bearer wbot_live_YOUR_API_KEY"}</Code>
            <p>
              Send keys from your backend or trusted automation. For a public
              website, use the Public Page or Embed Widget.
            </p>
          </Panel>
          <Panel title="2. Call your bot">
            <p>Publish a version and turn on API Access in the Deploy tab.</p>
            <Code>{`POST ${apiUrl}/api-run`}</Code>
            <Code>{sample.curl}</Code>
          </Panel>
          <Panel title="3. Read the result">
            <Code>
              {JSON.stringify(
                {
                  success: true,
                  data: "A",
                  execution: {
                    executionTimeMs: 4,
                    requestId: "request-uuid",
                    version: 1,
                  },
                },
                null,
                2,
              )}
            </Code>
            <p className="muted">
              Example response format. Actual timings and IDs come from each
              execution.
            </p>
          </Panel>
          <Panel title="JavaScript (server)">
            <Code>{sample.javascript}</Code>
          </Panel>
          <Panel title="Python">
            <Code>{sample.python}</Code>
          </Panel>
          <Panel title="TypeScript SDK">
            <Code>
              {`import { WasmBot } from '@wasmbot/sdk';\n\nconst bot = new WasmBot({\n  supabaseUrl: '${
                import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL"
              }',\n  bot: 'grade-calculator-a82f',\n  apiKey: process.env.WASMBOT_API_KEY\n});\nconst result = await bot.run({ score: 85 });\nconsole.log(result.data);`}
            </Code>
            <p>
              Build the included SDK package and install it from your project.
              It is not published to npm automatically.
            </p>
          </Panel>
          <Panel title="Webhook signatures">
            <p>
              Verify{" "}
              <code>X-WasmBot-Signature: t=TIMESTAMP,v1=HEX_SIGNATURE</code>
              {" "}
              with HMAC-SHA256 over{" "}
              <code>TIMESTAMP + "." + rawRequestBody</code>{" "}
              and your webhook secret. Reject timestamps older than five minutes
              and deduplicate using the delivery ID.
            </p>
          </Panel>
        </div>
        <aside>
          <Panel title="API essentials">
            <dl>
              <dt>Default API rate</dt>
              <dd>30 requests/minute/key</dd>
              <dt>Default public rate</dt>
              <dd>20 requests/minute/IP</dd>
              <dt>Payload / output</dt>
              <dd>64 KiB each</dd>
              <dt>WASM memory</dt>
              <dd>32 MiB maximum</dd>
            </dl>
            <p className="muted">
              Bot and system settings may lower these limits. On HTTP 429,
              respect Retry-After.
            </p>
          </Panel>
          <Panel title="Permissions">
            <p>
              <code>bot:run</code> — run published logic
            </p>
            <p>
              <code>bot:read</code> — read published schema with action: read
            </p>
            <p>
              <code>execution:read</code>{" "}
              — read last 50 executions with action: executions
            </p>
          </Panel>
          <Panel title="Error codes">
            {[
              "UNAUTHORIZED",
              "FORBIDDEN",
              "BOT_NOT_FOUND",
              "BOT_DISABLED",
              "BOT_BLOCKED",
              "BOT_NOT_PUBLISHED",
              "API_DISABLED",
              "INVALID_API_KEY",
              "API_KEY_REVOKED",
              "RATE_LIMITED",
              "VALIDATION_ERROR",
              "WASM_ERROR",
              "OUTPUT_TOO_LARGE",
            ].map((e) => (
              <p key={e}>
                <code>{e}</code>
              </p>
            ))}
          </Panel>
        </aside>
      </div>
    </>
  );
}
export function Profile() {
  const { profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.username || "");
  const { busy, run } = useAction();
  return (
    <>
      <Heading
        title="Profile"
        description="Your account and workspace identity."
      />
      <Panel title="Account details">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await supabase!.from("profiles").update({
                username: name,
              }).eq("id", profile!.id);
              if (error) throw error;
              await refresh();
            }, "Profile updated.");
          }}
        >
          <label>
            Name<input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Email<input disabled value={profile?.email || ""} />
          </label>
          <p>
            <Badge>{profile?.role}</Badge>
          </p>
          <div className="actions">
            <button className="primary" disabled={busy}>Save profile</button>
            <Link to="/forgot-password" className="secondary">
              Reset password
            </Link>
          </div>
        </form>
        <p className="muted">Account ID</p>
        <code>{profile?.id}</code> <CopyButton value={profile?.id || ""} />
      </Panel>
    </>
  );
}
