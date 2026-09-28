import { GettingStarted, StudioWelcome } from "../components/StudioWelcome";
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
        <span className="muted">จำนวนการใช้งานต่อวัน</span>
        <select
          aria-label="ช่วงเวลาของกราฟ"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          <option value={7}>7 วันล่าสุด</option>
          <option value={30}>30 วันล่าสุด</option>
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
        {bot.description || "ยังไม่ได้เพิ่มคำอธิบาย"}
      </p>
      <div className="bot-metadata">
        <span>
          <Activity size={14} />
          {Number(bot.run_count).toLocaleString()} ครั้ง
        </span>
        <span>
          {bot.is_published ? `เผยแพร่แล้ว · v${version || "—"}` : "ยังไม่เผยแพร่"}
        </span>
      </div>
      <div className="bot-card-footer">
        <span>{bot.category}</span>
        <Link to={`/bots/${bot.id}`}>
          เปิดบอท <ArrowUpRight size={16} />
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
      <StudioWelcome
        name={profile?.username}
        action={
          <Link className="primary" to="/bots/new">
            <Plus size={18} />สร้างบอทของฉัน<ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="section-heading">
        <div>
          <span className="section-overline">ภาพรวมพื้นที่ทำงาน</span>
          <h2>ทุกความเคลื่อนไหว ในที่เดียว</h2>
        </div>
        <span className="live-data-label">ข้อมูลจากการใช้งานจริง</span>
      </div>
      <div className="metrics">
        <Metric
          label="บอทของฉัน"
          value={analytics.data.analytics.botCounts.total}
          note={`${analytics.data.analytics.botCounts.published} เผยแพร่แล้ว`}
        />
        <Metric
          label="จำนวนการใช้งาน"
          value={Number(t.total).toLocaleString()}
          note={`${t.today} ครั้งวันนี้`}
        />
        <Metric
          label="อัตราสำเร็จ"
          value={t.total ? `${(100 * t.success / t.total).toFixed(1)}%` : "—"}
          note={`${t.success} สำเร็จ · ${t.failed} ไม่สำเร็จ`}
        />
        <Metric
          label="การเรียกผ่าน API"
          value={Number(t.api).toLocaleString()}
          note="รวมทุกบอทของคุณ"
        />
      </div>
      <div className="dashboard-workspace-grid">
        <div>
          <Panel
            title="แนวโน้มการใช้งาน"
            action={
              <span className="legend">
                <i /> บอททั้งหมด
              </span>
            }
          >
            <UsageChart daily={analytics.data.analytics.daily} />
          </Panel>
        </div>
        <GettingStarted
          action={
            <Link to="/bots/new" className="text-link">
              เริ่มสร้างบอท <ArrowUpRight size={16} />
            </Link>
          }
        />
      </div>
      <div className="section-heading">
        <h2>บอทของคุณ</h2>
        <MoreLink to="/bots">ดูบอททั้งหมด</MoreLink>
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
            <Empty title="พื้นที่นี้รอบอทตัวแรกของคุณ">
              <p>เริ่มจากเรื่องใกล้ตัว แล้วให้บอทช่วยตอบตามเงื่อนไข</p>
              <Link to="/bots/new" className="primary">
                <Plus size={16} />สร้างบอทตัวแรก
              </Link>
            </Empty>
          </Panel>
        )}
      <Panel
        title="การใช้งานล่าสุด"
        action={<MoreLink to="/history">ดูประวัติทั้งหมด</MoreLink>}
      >
        <ExecutionTable rows={history.data.executions.slice(0, 5)} />
      </Panel>
      <div className="tip-strip">
        <Box />
        <div>
          <strong>สร้างครั้งเดียว ใช้งานได้หลายช่องทาง</strong>
          <p>
            Publish your bot to get a public page, API endpoint, and embeddable
            widget.
          </p>
        </div>
        <Link to="/developer">
          อ่านคู่มือ <ArrowUpRight size={16} />
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
        eyebrow="ผู้ช่วยที่คุณสร้างเอง"
        title="บอทของฉัน"
        description="ดูแลทุกบอท ตั้งแต่ไอเดียแรกไปจนถึงเวอร์ชันที่พร้อมใช้งาน"
      >
        <Link className="primary" to="/bots/new">
          <Plus size={18} />สร้างบอท
        </Link>
      </Heading>
      <div className="search">
        <Search size={18} />
        <input
          aria-label="ค้นหาบอทในหน้านี้"
          placeholder="ค้นหาบอทในหน้านี้…"
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
                  {search &&
                    !data.bots.some((b: Bot) =>
                      b.name.toLowerCase().includes(search.toLowerCase())
                    ) && (
                    <Empty title="ไม่พบบอทที่ตรงกับคำค้น">
                      <button
                        className="secondary"
                        onClick={() => setSearch("")}
                      >
                        ล้างคำค้น
                      </button>
                    </Empty>
                  )}
                  {data.bots.filter((b: Bot) =>
                    b.name.toLowerCase().includes(search.toLowerCase())
                  ).map((b: Bot) => <BotCard key={b.id} bot={b} />)}
                </div>
              )
              : (
                <Empty title="ยังไม่มีบอทในพื้นที่นี้">
                  <Link className="primary" to="/bots/new">
                    สร้างบอทแรกของคุณ
                  </Link>
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
      <Empty title="ยังไม่มีประวัติการใช้งาน">
        <p>เมื่อทดลองหรือมีคนใช้งานบอท ผลลัพธ์จะแสดงที่นี่</p>
      </Empty>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>บอท / คำขอ</th>
            <th>ช่องทาง</th>
            <th>สถานะ</th>
            <th>ระยะเวลา</th>
            <th>วันและเวลา</th>
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
