import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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

const adminMetricLabels: Record<string, string> = {
  users: "ผู้ใช้ทั้งหมด",
  active_users: "ผู้ใช้ที่ใช้งานอยู่",
  suspended_users: "บัญชีที่ถูกระงับ",
  bots: "บอททั้งหมด",
  active_bots: "บอทที่เปิดใช้งาน",
  published_bots: "บอทที่เผยแพร่แล้ว",
  executions: "การทำงานทั้งหมด",
  reports: "รายงานปัญหา",
  Active: "เปิดใช้งาน",
  Blocked: "ถูกระงับ",
  Disabled: "ปิดใช้งาน",
  Published: "เผยแพร่แล้ว",
  Suspended: "บัญชีถูกระงับ",
};

const settingLabels: Record<string, string> = {
  max_bots_per_user: "จำนวนบอทสูงสุดต่อผู้ใช้",
  public_rate_limit: "จำนวนเรียกหน้าสาธารณะต่อนาที",
  api_rate_limit: "จำนวนเรียก API ต่อนาที",
  max_api_keys_per_user: "จำนวนกุญแจ API สูงสุดต่อผู้ใช้",
  max_payload_bytes: "ขนาดข้อมูลเข้าสูงสุด (ไบต์)",
  max_output_bytes: "ขนาดผลลัพธ์สูงสุด (ไบต์)",
  max_memory_bytes: "หน่วยความจำสูงสุด (ไบต์)",
  maintenance_mode: "โหมดปิดปรับปรุงระบบ",
  allow_registration: "อนุญาตให้สมัครสมาชิก",
  allow_public_bots: "อนุญาตบอทสาธารณะ",
  allow_api_access: "อนุญาตการใช้งานผ่าน API",
  allow_embed: "อนุญาตการฝังบอทในเว็บไซต์",
};
export function Admin() {
  const { profile } = useAuth();
  const { section = "dashboard", id } = useParams();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [section, id]);
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
    }, "ดำเนินการแล้ว และบันทึกไว้ในประวัติผู้ดูแลระบบ");
  const botStatus = (botId: string, status: string) => {
    const reason = status === "ACTIVE"
      ? ""
      : prompt("ระบุเหตุผลที่เปลี่ยนสถานะบอท (จำเป็น)");
    if (reason === null) return;
    if (
      confirm(
        status === "ACTIVE"
          ? "เปิดใช้งานบอทนี้หรือไม่?"
          : status === "BLOCKED"
          ? "ระงับบอทนี้หรือไม่?"
          : "ปิดใช้งานบอทนี้หรือไม่?",
      )
    ) action({ action: "bot-status", id: botId, status, reason });
  };
  const botActions = (b: any) => (
    <div className="actions">
      <Link className="text-link" to={`/admin/bots/${b.id}`}>ดูรายละเอียด</Link>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => botStatus(b.id, "ACTIVE")}
      >
        เปิดใช้งาน
      </button>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => botStatus(b.id, "DISABLED")}
      >
        ปิดใช้งาน
      </button>
      <button
        className="danger-text"
        disabled={busy}
        onClick={() => botStatus(b.id, "BLOCKED")}
      >
        ระงับ
      </button>
      <button
        className="text-link"
        disabled={busy}
        onClick={() => {
          if (confirm("ยกเลิกการเผยแพร่บอทนี้ทันทีหรือไม่?")) {
            action({
              action: "bot-unpublish",
              id: b.id,
            });
          }
        }}
      >
        ยกเลิกเผยแพร่
      </button>
      <button
        className="danger-text"
        disabled={busy}
        onClick={() => {
          if (confirm("ลบบอทนี้และหยุดทุกช่องทางใช้งานหรือไม่?")) {
            action({
              action: "bot-delete",
              id: b.id,
            });
          }
        }}
      >
        ลบ
      </button>
    </div>
  );
  return (
    <>
      <Heading
        eyebrow="ผู้ดูแลระบบ"
        title={section === "dashboard" ? "ภาพรวมระบบ" : ({
          users: "จัดการผู้ใช้",
          bots: "จัดการบอท",
          executions: "ประวัติการทำงาน",
          reports: "รายงานปัญหา",
          monitoring: "ติดตามระบบ",
          logs: "บันทึกผู้ดูแล",
          settings: "ตั้งค่าระบบ",
        }[section] || section)}
        description={{
          dashboard: "สรุปจำนวนผู้ใช้ บอท และการใช้งานในระบบ",
          users: "ดูบัญชีผู้ใช้และจัดการสถานะการใช้งาน",
          bots: "ตรวจสอบบอทและสถานะการเผยแพร่",
          executions: "ตรวจข้อมูลและผลลัพธ์ของการทำงานแต่ละครั้ง",
          reports: "ตรวจสอบปัญหาที่ผู้ใช้แจ้งเข้ามา",
          monitoring: "ติดตามข้อผิดพลาดและสถานะการทำงาน",
          logs: "ตรวจสอบประวัติการดำเนินการของผู้ดูแลระบบ",
          settings: "กำหนดค่าการทำงานของระบบ",
        }[section]}
      />
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
                <Metric
                  key={k}
                  label={adminMetricLabels[k] || k.replaceAll("_", " ")}
                  value={String(v)}
                />
              ))}
              <Metric
                label="การทำงานทั้งหมด"
                value={data.analytics.totals.total}
              />
              <Metric
                label="การทำงานวันนี้"
                value={data.analytics.totals.today}
              />
              <Metric
                label="ทำงานไม่สำเร็จ"
                value={data.analytics.totals.failed}
              />
              <Metric
                label="เรียกผ่าน API วันนี้"
                value={data.analytics.totals.api_today}
              />
            </div>
            <Panel title="กิจกรรมการใช้งาน">
              <UsageChart daily={data.analytics.daily} />
            </Panel>
            <div className="two-col">
              <Panel title="ผู้ใช้ใหม่ · 7 วัน">
                <CreationChart rows={data.newUsers} />
              </Panel>
              <Panel title="บอทที่สร้าง · 7 วัน">
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
            <Panel title="บอทที่มีอัตราผิดพลาดสูง">
              <p className="muted">
                แสดงบอทที่ทำงานมากกว่า 20 ครั้ง และผิดพลาดเกิน 50%
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
                : <Empty title="ไม่พบบอทที่มีอัตราผิดพลาดสูง" />}
            </Panel>
            <Panel title="ข้อผิดพลาดในชั่วโมงที่ผ่านมา">
              <p className="muted">
                รายการหมดเวลา ใช้หน่วยความจำเกิน และเรียกใช้งานถี่เกินไป
                สูงสุด 1,000 รายการ
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
                เจ้าของ:{" "}
                <Link to={`/admin/users/${data.bot.user_id}`}>
                  {data.bot.user_id}
                </Link>
              </p>
              {botActions(data.bot)}
              <div className="metrics">
                <Metric label="จำนวนครั้งที่ทำงาน" value={data.bot.run_count} />
                <Metric label="สำเร็จ" value={data.bot.success_count} />
                <Metric label="ผิดพลาด" value={data.bot.failure_count} />
                <Metric
                  label="เวลาประมวลผลเฉลี่ย"
                  value={`${
                    Number(data.analytics.totals.average_ms).toFixed(1)
                  } ms`}
                />
              </div>
            </Panel>
            <Playground bot={data.bot} admin />
            <div className="two-col">
              <Panel title="เงื่อนไข">
                <Json value={data.bot.rule_definition} />
              </Panel>
              <Panel title="รูปแบบข้อมูลรับเข้า">
                <Json value={data.bot.input_schema} />
              </Panel>
            </div>
            <Panel title="ประวัติการเผยแพร่">
              <Json value={data.deployments} />
            </Panel>
            <Panel title="ประวัติการทำงาน">
              <ExecutionTable rows={data.executions} admin />
            </Panel>
          </>
        )
        : section === "executions" && id
        ? (
          <>
            <Panel title="รายละเอียดการทำงาน">
              <Badge>{data.execution.status}</Badge>
              <Json
                value={{
                  requestId: data.execution.request_id,
                  bot: data.execution.bots?.name,
                  version: data.execution.bot_deployments?.version ?? "ฉบับร่าง",
                  source: data.execution.source,
                  time: data.execution.created_at,
                  durationMs: data.execution.execution_time_ms,
                  memoryUsed: data.execution.memory_used,
                  error: data.execution.error_message,
                }}
              />
            </Panel>
            <div className="two-col">
              <Panel title="ข้อมูลรับเข้า">
                <Json value={data.execution.input} />
              </Panel>
              <Panel title="ผลลัพธ์">
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
            <Panel title="บอทของผู้ใช้นี้">
              {data.bots.map((b: any) => (
                <div className="list-row" key={b.id}>
                  <Link to={`/admin/bots/${b.id}`}>{b.name}</Link>
                  <Badge>{b.status}</Badge>
                  <span>ทำงาน {b.run_count} ครั้ง</span>
                </div>
              ))}
            </Panel>
          </>
        )
        : (
          <Panel>
            {!data.rows?.length
              ? <Empty title="ยังไม่มีข้อมูลในส่วนนี้" />
              : section === "executions"
              ? <ExecutionTable rows={data.rows} admin />
              : section === "users"
              ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ผู้ใช้</th>
                        <th>สิทธิ์</th>
                        <th>สถานะ</th>
                        <th>บอท / การทำงาน</th>
                        <th>สร้างเมื่อ / ใช้ล่าสุด</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <Link to={`/admin/users/${u.id}`}>
                              <strong>{u.username || "ผู้ใช้ยังไม่ได้ตั้งชื่อ"}</strong>
                              <small>{u.email}</small>
                            </Link>
                          </td>
                          <td><Badge>{u.role}</Badge></td>
                          <td>
                            <Badge>{u.status}</Badge>
                          </td>
                          <td>{u.bot_count} / {u.run_count}</td>
                          <td>
                            {formatDate(u.created_at)}
                            <small>
                              {u.last_active_at
                                ? formatDate(u.last_active_at)
                                : "ยังไม่มีประวัติการใช้งาน"}
                            </small>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="text-link"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(
                                      u.status === "ACTIVE"
                                        ? "ระงับบัญชีผู้ใช้นี้หรือไม่?"
                                        : "ยกเลิกการระงับบัญชีนี้หรือไม่?",
                                    )
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
                                  ? "ระงับบัญชี"
                                  : "ยกเลิกระงับ"}
                              </button>
                              <button
                                className="text-link"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `เปลี่ยนสิทธิ์เป็น ${
                                        u.role === "ADMIN" ? "ผู้ใช้งาน" : "ผู้ดูแลระบบ"
                                      } หรือไม่?`,
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
                                เปลี่ยนสิทธิ์
                              </button>
                              <button
                                className="danger-text"
                                disabled={busy || u.id === profile.id}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "ปิดบัญชีนี้ เพิกถอนกุญแจ API และลบบอททั้งหมดหรือไม่? ประวัติการตรวจสอบจะยังถูกเก็บไว้",
                                    )
                                  ) action({ action: "user-delete", id: u.id });
                                }}
                              >
                                ลบ
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
                        <th>บอท</th>
                        <th>เจ้าของ</th>
                        <th>สถานะ</th>
                        <th>ช่องทางใช้งาน</th>
                        <th>การทำงาน / ผิดพลาด</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((b: any) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.name}</strong>
                            <small>
                              {b.deleted_at
                                ? "ลบแล้ว"
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
                            {b.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                            <small>
                              API {b.allow_api_access ? "เปิด" : "ปิด"} · ฝังเว็บ
                              {" "}
                              {b.allow_embed ? "เปิด" : "ปิด"}
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
                  <Link to={`/admin/bots/${r.bot_id}`}>ดูบอทที่ถูกรายงาน</Link>
                  <div className="actions">
                    {["REVIEWED", "DISMISSED", "ACTION_TAKEN"].map((status) => (
                      <button
                        className="secondary small"
                        disabled={busy}
                        key={status}
                        onClick={() =>
                          action({ action: "report", id: r.id, status })}
                      >
                        <Badge>{status}</Badge>
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
                        <th>เวลา</th>
                        <th>ผู้ดูแล</th>
                        <th>การดำเนินการ</th>
                        <th>รายการ</th>
                        <th>รายละเอียด</th>
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
    <Panel title="ตั้งค่าระบบ">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            async () => onSave(SettingsSchema.parse(settings)),
            "บันทึกการตั้งค่าระบบแล้ว",
          );
        }}
      >
        {Object.entries(settings).map(([key, value]) => (
          <label
            className={typeof value === "boolean" ? "toggle-row" : ""}
            key={key}
          >
            {settingLabels[key] || key.replaceAll("_", " ")}
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
        <button className="primary" disabled={busy}>บันทึกการตั้งค่า</button>
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
