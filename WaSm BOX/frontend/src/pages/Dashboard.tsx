import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bot as BotIcon,
  Box,
  Plus,
  Search,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth, useResource } from "../lib/context";
import {
  Badge,
  Empty,
  ErrorBox,
  formatDate,
  Heading,
  Loading,
  Metric,
  MoreLink,
  Pagination,
  Panel,
} from "../components/ui";
import type { Bot } from "../../../supabase/functions/_shared/schema";
export function UsageChart({ daily }: { daily: any[] }) {
  const [range, setRange] = useState(7);
  return (
    <>
      <div className="chart-toolbar">
        <span className="muted">Executions per day</span>
        <select
          aria-label="Chart range"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={daily.slice(-range)}
            margin={{ left: -20, right: 15, top: 15 }}
          >
            <defs>
              <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf0f6" />
            <XAxis
              dataKey="day"
              tickFormatter={(x) =>
                new Date(x).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="runs"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#usageFill)"
            />
            <Area
              type="monotone"
              dataKey="failures"
              stroke="#f97316"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
export function BotCard({ bot }: { bot: Bot & { bot_deployments?: any[] } }) {
  const version = bot.bot_deployments?.find((d) => d.active)?.version;
  return (
    <article className="bot-card">
      <div className="bot-card-top">
        <span className="bot-icon">
          <BotIcon size={24} />
        </span>
        <Badge>{bot.status}</Badge>
      </div>
      <Link to={`/bots/${bot.id}`}>
        <h3>{bot.name}</h3>
      </Link>
      <p className="muted description">
        {bot.description || "No description yet."}
      </p>
      <div className="bot-metadata">
        <span>
          <Activity size={14} />
          {Number(bot.run_count).toLocaleString()} runs
        </span>
        <span>
          {bot.is_published
            ? `Published · v${version || "—"}`
            : "Not published"}
        </span>
      </div>
      <div className="bot-card-footer">
        <span>{bot.category}</span>
        <Link to={`/bots/${bot.id}`}>
          Open bot <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
export function Dashboard() {
  const { profile } = useAuth();
  const bots = useResource("studio"),
    analytics = useResource("studio?resource=analytics"),
    history = useResource("studio?resource=executions");
  if (bots.loading || analytics.loading || history.loading) return <Loading />;
  if (bots.error || analytics.error || history.error) {
    return (
      <ErrorBox
        error={bots.error || analytics.error || history.error}
        retry={() => {
          bots.reload();
          analytics.reload();
          history.reload();
        }}
      />
    );
  }
  const t = analytics.data.analytics.totals;
  return (
    <>
      <Heading
        eyebrow="WORKSPACE OVERVIEW"
        title={`Welcome back${
          profile?.username ? `, ${profile.username}` : ""
        }`}
        description="Your business logic, at a glance."
      >
        <Link className="primary" to="/bots/new">
          <Plus size={18} />Create bot
        </Link>
      </Heading>
      <div className="metrics">
        <Metric
          label="My bots"
          value={analytics.data.analytics.botCounts.total}
          note={`${analytics.data.analytics.botCounts.published} published`}
        />
        <Metric
          label="Total executions"
          value={Number(t.total).toLocaleString()}
          note={`${t.today} today`}
        />
        <Metric
          label="Success rate"
          value={t.total ? `${(100 * t.success / t.total).toFixed(1)}%` : "—"}
          note={`${t.success} successful · ${t.failed} failed`}
        />
        <Metric
          label="API requests"
          value={Number(t.api).toLocaleString()}
          note="Across your bots"
        />
      </div>
      <Panel
        title="Execution activity"
        action={
          <span className="legend">
            <i /> All bots
          </span>
        }
      >
        <UsageChart daily={analytics.data.analytics.daily} />
      </Panel>
      <div className="section-heading">
        <h2>Your bots</h2>
        <MoreLink to="/bots">View all bots</MoreLink>
      </div>
      {bots.data.bots.length
        ? (
          <div className="bot-grid">
            {bots.data.bots.slice(0, 3).map((b: Bot) => (
              <BotCard key={b.id} bot={b} />
            ))}
          </div>
        )
        : (
          <Panel>
            <Empty title="Your first bot starts here">
              <p>Turn a business rule into a reusable service.</p>
              <Link to="/bots/new" className="primary">
                <Plus size={16} />Create your first bot
              </Link>
            </Empty>
          </Panel>
        )}
      <Panel
        title="Recent executions"
        action={<MoreLink to="/history">View history</MoreLink>}
      >
        <ExecutionTable rows={history.data.executions.slice(0, 5)} />
      </Panel>
      <div className="tip-strip">
        <Box />
        <div>
          <strong>Build once. Connect everywhere.</strong>
          <p>
            Publish your bot to get a public page, API endpoint, and embeddable
            widget.
          </p>
        </div>
        <Link to="/developer">
          Read the guide <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
export function Bots() {
  const [page, setPage] = useState(0), [search, setSearch] = useState("");
  const { data, loading, error, reload } = useResource(`studio?page=${page}`);
  return (
    <>
      <Heading
        eyebrow="YOUR WORKSPACE"
        title="My bots"
        description="Create, test, and manage your reusable business logic."
      >
        <Link className="primary" to="/bots/new">
          <Plus size={18} />Create bot
        </Link>
      </Heading>
      <div className="search">
        <Search size={18} />
        <input
          aria-label="Search bots on this page"
          placeholder="Search bots on this page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading
        ? <Loading />
        : error
        ? <ErrorBox error={error} retry={reload} />
        : (
          <>
            {data.bots.length
              ? (
                <div className="bot-grid">
                  {data.bots.filter((b: Bot) =>
                    b.name.toLowerCase().includes(search.toLowerCase())
                  ).map((b: Bot) => <BotCard key={b.id} bot={b} />)}
                </div>
              )
              : (
                <Empty title="No bots yet">
                  <Link className="primary" to="/bots/new">Create a bot</Link>
                </Empty>
              )}
            <Pagination
              page={page}
              setPage={setPage}
              count={data.bots.length}
            />
          </>
        )}
    </>
  );
}
export function ExecutionTable(
  { rows, admin = false }: { rows: any[]; admin?: boolean },
) {
  if (!rows.length) {
    return (
      <Empty title="No executions yet">
        <p>Run a bot to see its results here.</p>
      </Empty>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bot / request</th>
            <th>Source</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link
                  to={admin ? `/admin/executions/${r.id}` : `/history/${r.id}`}
                >
                  <strong>{r.bots?.name || r.request_id.slice(0, 8)}</strong>
                </Link>
              </td>
              <td>
                <span className="source">{r.source.replaceAll("_", " ")}</span>
              </td>
              <td>
                <Badge>{r.status}</Badge>
              </td>
              <td>{r.execution_time_ms} ms</td>
              <td className="muted">{formatDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
