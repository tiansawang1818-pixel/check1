import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../lib/context";
import {
  Badge,
  ErrorBox,
  formatDate,
  Heading,
  Json,
  Loading,
  Pagination,
  Panel,
} from "../components/ui";
import { ExecutionTable } from "./Dashboard";
export function History() {
  const [page, setPage] = useState(0),
    [bot, setBot] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [date, setDate] = useState("");
  const bots = useResource("studio");
  const query = new URLSearchParams({
    resource: "executions",
    page: String(page),
    bot,
    status,
    source,
    date,
  });
  const { data, loading, error, reload } = useResource(`studio?${query}`);
  return (
    <>
      <Heading
        eyebrow="ตรวจสอบการทำงาน"
        title="ประวัติการรัน"
        description="ดูข้อมูลที่รับเข้า ผลลัพธ์ และประสิทธิภาพของการรันแต่ละครั้ง"
      />
      <Panel>
        {bots.error && <ErrorBox error="โหลดรายชื่อบอทสำหรับตัวกรองไม่สำเร็จ" retry={bots.reload} />}
        <div className="filters">
          <label>
            บอท<select
              value={bot}
              onChange={(e) => {
                setBot(e.target.value);
                setPage(0);
              }}
            >
              <option value="">ทุกบอท</option>
              {bots.data?.bots.map((b: any) => (
                <option value={b.id} key={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label>
            สถานะ<select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">ทุกสถานะ</option>
              {[
                "SUCCESS",
                "RUNTIME_ERROR",
                "VALIDATION_ERROR",
                "TIMEOUT",
                "MEMORY_LIMIT",
                "BLOCKED",
                "RATE_LIMITED",
              ].map((s) => <option key={s} value={s}>{{ SUCCESS: "สำเร็จ", RUNTIME_ERROR: "ประมวลผลผิดพลาด", VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง", TIMEOUT: "เกินเวลาที่กำหนด", MEMORY_LIMIT: "หน่วยความจำเกินกำหนด", BLOCKED: "ถูกระงับ", RATE_LIMITED: "เรียกใช้งานถี่เกินไป" }[s]}</option>)}
            </select>
          </label>
          <label>
            ช่องทาง<select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(0);
              }}
            >
              <option value="">ทุกช่องทาง</option>
              {["DASHBOARD", "PUBLIC_PAGE", "API", "EMBED"].map((s) => (
                <option key={s} value={s}>{{ DASHBOARD: "หน้าทดสอบ", PUBLIC_PAGE: "หน้าสาธารณะ", API: "API", EMBED: "เว็บไซต์ที่ฝังบอท" }[s]}</option>
              ))}
            </select>
          </label>
          <label>
            วันที่ (UTC)<input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        {loading
          ? <Loading />
          : error
          ? <ErrorBox error={error} retry={reload} />
          : (
            <>
              <ExecutionTable rows={data.executions} />
              <Pagination
                page={page}
                setPage={setPage}
                count={data.executions.length}
              />
            </>
          )}
      </Panel>
    </>
  );
}
export function ExecutionDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useResource(
    `studio?resource=executions&id=${id}`,
  );
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  const e = data.executions[0];
  if (!e) return <ErrorBox error="ไม่พบประวัติการรันนี้" />;
  return (
    <>
      <Heading title="รายละเอียดการรัน" description={e.request_id}>
        <Badge>{e.status}</Badge>
        <Link className="secondary" to={`/bots/${e.bot_id}/executions`}>
          เปิดบอท
        </Link>
      </Heading>
      <Panel>
        <dl>
          <dt>บอท</dt>
          <dd>{e.bots?.name || "บอทที่ไม่พร้อมใช้งาน"}</dd>
          <dt>ช่องทาง</dt>
          <dd>{{
            DASHBOARD: "หน้าทดสอบ",
            PUBLIC_PAGE: "หน้าสาธารณะ",
            API: "API",
            EMBED: "เว็บไซต์ที่ฝังบอท",
          }[e.source as string] || e.source}</dd>
          <dt>เวลา</dt>
          <dd>{formatDate(e.created_at)}</dd>
          <dt>การประมวลผล</dt>
          <dd>{e.execution_time_ms} ms</dd>
          <dt>หน่วยความจำ</dt>
          <dd>{e.memory_used ?? "—"} bytes</dd>
          <dt>เวอร์ชันใช้งานจริง</dt>
          <dd>
            {e.bot_deployments ? `v${e.bot_deployments.version}` : "ฉบับร่าง"}
          </dd>
        </dl>
        {e.error_message && <ErrorBox error={e.error_message} />}
      </Panel>
      <div className="two-col">
        <Panel title="ข้อมูลรับเข้า">
          <Json value={e.input} />
        </Panel>
        <Panel title="ผลลัพธ์">
          <Json value={e.output} />
        </Panel>
      </div>
    </>
  );
}
