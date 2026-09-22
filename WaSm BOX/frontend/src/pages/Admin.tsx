import { useState } from "react";
import { Link, Navigate, NavLink, useParams } from "react-router-dom";
import { useAction, useAuth, useResource } from "../lib/context";
import { api } from "../lib/api";
import { SettingsSchema } from "../../../supabase/functions/_shared/schema";
import {
  Badge,
  Empty,
  ErrorBox,
  formatDate,
  Heading,
  Json,
  Loading,
  Metric,
  Pagination,
  Panel,
} from "../components/ui";
import { ExecutionTable, UsageChart } from "./Dashboard";
import { Playground } from "./BotDetail";
export function Admin() {
  const { profile } = useAuth();
  const { section = "dashboard", id } = useParams();
  const [page, setPage] = useState(0);
  const resource = useResource(
    profile?.role === "ADMIN"
      ? `admin?resource=${section}&page=${page}${id ? `&id=${id}` : ""}`
      : null,
  );
  const { run, busy } = useAction();
  if (profile?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  const { data, loading, error, reload } = resource;
  const action = (payload: any) =>
    void run(async () => {
      await api("admin", "POST", payload);
      reload();
    }, "Action recorded in audit log.");
  const botStatus = (botId: string, status: string) => {
    const reason = status === "ACTIVE"
      ? ""
      : prompt(`Reason for ${status.toLowerCase()} (required)`);
    if (reason === null) return;
    if (
      confirm(
        `${
          status === "ACTIVE"
            ? "Enable"
            : status === "BLOCKED"
            ? "Block"
            : "Disable"
        } this bot?`,
      )
    ) action({ action: "bot-status", id: botId, status, reason });
  };
  const botActions = (b: any) => (
    <div className="actions">
      <Link className="text-link" to={`/admin/bots/${b.id}`}>View</Link>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => botStatus(b.id, "ACTIVE")}
      >
        Enable
      </button>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => botStatus(b.id, "DISABLED")}
      >
        Disable
      </button>
      <button
        className="danger-text"
        disabled={busy}
        onClick={() => botStatus(b.id, "BLOCKED")}
      >
        Block
      </button>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => {
          if (confirm("Force unpublish this bot?")) {
            action({
              action: "bot-unpublish",
              id: b.id,
            });
          }
        }}
      >
        Unpublish
      </button>
      <button
        className="danger-text"
        disabled={busy}
        onClick={() => {
          if (confirm("Soft-delete this bot and stop all channels?")) {
            action({
              action: "bot-delete",
              id: b.id,
            });
          }
        }}
      >
        Delete
      </button>
    </div>
  );
  return (
    <>
      <Heading
        eyebrow="ADMINISTRATION"
        title={section === "dashboard"
          ? "Platform overview"
          : `Manage ${section}`}
        description="System-wide controls. Every administrative change is audited."
      />
      <nav className="tabs">
        {[
          "dashboard",
          "users",
          "bots",
          "executions",
          "reports",
          "monitoring",
          "logs",
          "settings",
        ].map((s) => (
          <NavLink
            key={s}
            to={`/admin/${s}`}
            className={s === section ? "active" : ""}
            onClick={() => setPage(0)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </NavLink>
        ))}
      </nav>
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} retry={reload} />
        : !data
        ? null
        : section === "dashboard"
        ? (
          <>
            <div className="metrics">
              {Object.entries(data.stats).map(([k, v]) => (
                <Metric key={k} label={k} value={String(v)} />
              ))}
              <Metric
                label="Total executions"
                value={data.analytics.totals.total}
              />
              <Metric
                label="Executions today"
                value={data.analytics.totals.today}
              />
              <Metric
                label="Failed executions"
                value={data.analytics.totals.failed}
              />
              <Metric
                label="API executions today"
                value={data.analytics.totals.api_today}
              />
            </div>
            <Panel title="Execution activity">
              <UsageChart daily={data.analytics.daily} />
            </Panel>
            <div className="two-col">
              <Panel title="New users · 7 days">
                <CreationChart rows={data.newUsers} />
              </Panel>
              <Panel title="Bots created · 7 days">
                <CreationChart rows={data.newBots} />
              </Panel>
            </div>
          </>
        )
        : section === "settings"
        ? (
          <AdminSettings
            initial={data.settings}
            onSave={async (settings) => {
              await api("admin", "POST", {
                action: "settings",
                data: settings,
              });
              reload();
            }}
          />
        )
        : section === "monitoring"
        ? (
          <>
            <Panel title="High failure rate">
              <p className="muted">
                More than 20 runs with a failure rate above 50%.
              </p>
              {data.bots.filter((b: any) => b.failure_count / b.run_count > .5)
                  .length
                ? data.bots.filter((b: any) =>
                  b.failure_count / b.run_count > .5
                ).map((b: any) => (
                  <div className="list-row" key={b.id}>
                    <Link to={`/admin/bots/${b.id}`}>{b.name}</Link>
                    <strong>
                      {(100 * b.failure_count / b.run_count).toFixed(1)}%
                    </strong>
                    {botActions(b)}
                  </div>
                ))
                : <Empty title="No high-failure bots found" />}
            </Panel>
            <Panel title="Errors in the last hour">
              <p className="muted">
                Recent timeout, memory, and rate-limit events (up to 1,000
                records).
              </p>
              <Json value={data.errors} />
            </Panel>
          </>
        )
        : section === "bots" && id
        ? (
          <>
            <Panel title={data.bot.name}>
              <Badge>{data.bot.status}</Badge>
              <p>{data.bot.description}</p>
              <p>
                Owner:{" "}
                <Link to={`/admin/users/${data.bot.user_id}`}>
                  {data.bot.user_id}
                </Link>
              </p>
              {botActions(data.bot)}
              <div className="metrics">
                <Metric label="Runs" value={data.bot.run_count} />
                <Metric label="Successful" value={data.bot.success_count} />
                <Metric label="Failures" value={data.bot.failure_count} />
                <Metric
                  label="Average duration"
                  value={`${
                    Number(data.analytics.totals.average_ms).toFixed(1)
                  } ms`}
                />
              </div>
            </Panel>
            <Playground bot={data.bot} admin />
            <div className="two-col">
              <Panel title="Rules">
                <Json value={data.bot.rule_definition} />
              </Panel>
              <Panel title="Input schema">
                <Json value={data.bot.input_schema} />
              </Panel>
            </div>
            <Panel title="Deployments">
              <Json value={data.deployments} />
            </Panel>
            <Panel title="Executions">
              <ExecutionTable rows={data.executions} admin />
            </Panel>
          </>
        )
        : section === "executions" && id
        ? (
          <>
            <Panel title="Execution detail">
              <Badge>{data.execution.status}</Badge>
              <Json
                value={{
                  requestId: data.execution.request_id,
                  bot: data.execution.bots?.name,
                  version: data.execution.bot_deployments?.version ?? "Draft",
                  source: data.execution.source,
                  time: data.execution.created_at,
                  durationMs: data.execution.execution_time_ms,
                  memoryUsed: data.execution.memory_used,
                  error: data.execution.error_message,
                }}
              />
            </Panel>
            <div className="two-col">
              <Panel title="Input">
                <Json value={data.execution.input} />
              </Panel>
              <Panel title="Output">
                <Json value={data.execution.output} />
              </Panel>
            </div>
          </>
        )
        : section === "users" && id
        ? (
          <>
            <Panel title={data.profile.username || data.profile.email}>
              <Json value={data.profile} />
            </Panel>
            <Panel title="User bots">
              {data.bots.map((b: any) => (
                <div className="list-row" key={b.id}>
                  <Link to={`/admin/bots/${b.id}`}>{b.name}</Link>
                  <Badge>{b.status}</Badge>
                  <span>{b.run_count} runs</span>
                </div>
              ))}
            </Panel>
          </>
        )
        : (
          <Panel>
            {!data.rows?.length
              ? <Empty title={`No ${section} records`} />
              : section === "executions"
              ? <ExecutionTable rows={data.rows} admin />
              : section === "users"
              ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Bots / Runs</th>
                        <th>Created / Last active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <Link to={`/admin/users/${u.id}`}>
                              <strong>{u.username || "Unnamed user"}</strong>
                              <small>{u.email}</small>
                            </Link>
                          </td>
                          <td>{u.role}</td>
                          <td>
                            <Badge>{u.status}</Badge>
                          </td>
                          <td>{u.bot_count} / {u.run_count}</td>
                          <td>
                            {formatDate(u.created_at)}
                            <small>
                              {u.last_active_at
                                ? formatDate(u.last_active_at)
                                : "No activity recorded"}
                            </small>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="text-link"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(`${
                                      u.status === "ACTIVE"
                                        ? "Suspend"
                                        : "Unsuspend"
                                    } this user?`)
                                  ) {
                                    action({
                                      action: "user-status",
                                      id: u.id,
                                      status: u.status === "ACTIVE"
                                        ? "SUSPENDED"
                                        : "ACTIVE",
                                    });
                                  }
                                }}
                              >
                                {u.status === "ACTIVE"
                                  ? "Suspend"
                                  : "Unsuspend"}
                              </button>
                              <button
                                className="text-link"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Change role to ${
                                        u.role === "ADMIN" ? "USER" : "ADMIN"
                                      }?`,
                                    )
                                  ) {
                                    action({
                                      action: "user-role",
                                      id: u.id,
                                      role: u.role === "ADMIN"
                                        ? "USER"
                                        : "ADMIN",
                                    });
                                  }
                                }}
                              >
                                Change role
                              </button>
                              <button
                                className="danger-text"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Deactivate this account, revoke keys, and soft-delete their bots? Auth identity and audit history are retained.",
                                    )
                                  ) action({ action: "user-delete", id: u.id });
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
              : section === "bots"
              ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Bot</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Channels</th>
                        <th>Runs / Failures</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((b: any) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.name}</strong>
                            <small>
                              {b.deleted_at
                                ? "Deleted"
                                : formatDate(b.created_at)}
                            </small>
                          </td>
                          <td>
                            <Link to={`/admin/users/${b.user_id}`}>
                              {b.user_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td>
                            <Badge>{b.status}</Badge>
                          </td>
                          <td>
                            {b.is_published ? "Published" : "Draft"}
                            <small>
                              API {b.allow_api_access ? "on" : "off"} · Embed
                              {" "}
                              {b.allow_embed ? "on" : "off"}
                            </small>
                          </td>
                          <td>{b.run_count} / {b.failure_count}</td>
                          <td>{botActions(b)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              : section === "reports"
              ? data.rows.map((r: any) => (
                <div className="report-card" key={r.id}>
                  <div className="panel-heading">
                    <h3>{r.reason}</h3>
                    <Badge>{r.status}</Badge>
                  </div>
                  <p>{r.description}</p>
                  <Link to={`/admin/bots/${r.bot_id}`}>View reported bot</Link>
                  <div className="actions">
                    {["REVIEWED", "DISMISSED", "ACTION_TAKEN"].map((status) => (
                      <button
                        className="secondary small"
                        disabled={busy}
                        key={status}
                        onClick={() =>
                          action({ action: "report", id: r.id, status })}
                      >
                        {status.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                  {botActions({ id: r.bot_id })}
                </div>
              ))
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r: any) => (
                        <tr key={r.id}>
                          <td>{formatDate(r.created_at)}</td>
                          <td>{r.admin_user_id.slice(0, 8)}</td>
                          <td>{r.action}</td>
                          <td>
                            {r.target_type}
                            <small>{r.target_id}</small>
                          </td>
                          <td>
                            <Json value={r.details} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            <Pagination
              page={page}
              setPage={setPage}
              count={data.rows?.length || 0}
            />
          </Panel>
        )}
    </>
  );
}
function AdminSettings(
  { initial, onSave }: {
    initial: any;
    onSave: (settings: any) => Promise<void>;
  },
) {
  const [settings, setSettings] = useState(initial);
  const { busy, run } = useAction();
  return (
    <Panel title="System settings">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            async () => onSave(SettingsSchema.parse(settings)),
            "System settings saved.",
          );
        }}
      >
        {Object.entries(settings).map(([key, value]) => (
          <label
            className={typeof value === "boolean" ? "toggle-row" : ""}
            key={key}
          >
            {key.replaceAll("_", " ")}
            {typeof value === "boolean"
              ? (
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })}
                />
              )
              : (
                <input
                  type="number"
                  min={1}
                  value={Number(value)}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: Number(e.target.value) })}
                />
              )}
          </label>
        ))}
        <button className="primary" disabled={busy}>Save settings</button>
      </form>
    </Panel>
  );
}
function CreationChart({ rows }: { rows: any[] }) {
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(
      0,
      10,
    );
    return {
      day,
      runs: rows.find((r) => r.day === day)?.runs || 0,
      failures: 0,
    };
  });
  return <UsageChart daily={daily} />;
}
