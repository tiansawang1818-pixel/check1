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
        eyebrow="สำหรับผู้พัฒนา"
        title="กุญแจ API"
        description="กำหนดสิทธิ์ให้แอปพลิเคชันเชื่อมต่อบอทของคุณ"
      >
        <button className="primary" onClick={() => setCreate(!create)}>
          <Plus size={17} />สร้างกุญแจ API
        </button>
      </Heading>
      {key && (
        <Panel title="คัดลอกกุญแจ API เก็บไว้ตอนนี้">
          <p>
            กุญแจจะแสดงครั้งเดียว เก็บไว้บนเซิร์ฟเวอร์ที่คุณควบคุม
          </p>
          <Code>{key}</Code>
          <button className="secondary" onClick={() => setKey("")}>
            บันทึกกุญแจไว้แล้ว
          </button>
        </Panel>
      )}
      {create && (
        <Panel title="สร้างกุญแจใหม่">
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
              }, "สร้างกุญแจ API แล้ว");
            }}
          >
            <label>
              ชื่อ<input
                required
                maxLength={100}
                placeholder="เช่น แอปสำหรับใช้งานจริง"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <fieldset>
              <legend>สิทธิ์การใช้งาน</legend>
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
                  {{ "bot:run": "รันบอท", "bot:read": "อ่านรูปแบบข้อมูลบอท", "execution:read": "อ่านประวัติการรัน" }[s]} <code>{s}</code>
                </label>
              ))}
            </fieldset>
            <label className="check-label">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAll(e.target.checked)}
              />บอททั้งหมดของฉัน
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
              สร้างกุญแจ
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
                        <th>ชื่อ</th>
                        <th>กุญแจ</th>
                        <th>สิทธิ์</th>
                        <th>จำนวนครั้งที่ใช้</th>
                        <th>ใช้ล่าสุด</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
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
                              : "ยังไม่เคยใช้"}
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
                                  const name = prompt("ชื่อใหม่ของกุญแจ", k.name);
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
                                เปลี่ยนชื่อ
                              </button>
                              <button
                                className="text-link"
                                disabled={busy || Boolean(k.revoked_at)}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `เพิกถอน ${k.name} หรือไม่? แอปที่ใช้กุญแจนี้จะเชื่อมต่อไม่ได้`,
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
                                เพิกถอน
                              </button>
                              <button
                                className="danger-text"
                                disabled={busy}
                                onClick={() => {
                                  if (confirm(`ลบกุญแจ ${k.name} หรือไม่?`)) {
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
              : (
                <Empty title="ยังไม่มีกุญแจ API">
                  <KeyRound />
                  <p>สร้างกุญแจเพื่อเรียกบอทจากแอปพลิเคชันของคุณ</p>
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
        eyebrow="สำหรับผู้พัฒนา"
        title="คู่มือเชื่อมต่อ"
        description="เรียกใช้บอทที่เผยแพร่แล้วผ่าน API หรือฝังบนเว็บไซต์"
      >
        <Link className="primary" to="/developer/api-keys">
          <KeyRound size={16} />จัดการกุญแจ API
        </Link>
      </Heading>
      <div className="docs-grid">
        <div>
          <Panel title="1. ยืนยันสิทธิ์การเชื่อมต่อ">
            <p>
              สร้างกุญแจ API ที่มีสิทธิ์ <code>bot:run</code>{" "}
              โดยกุญแจจะใช้ได้เฉพาะบัญชีของคุณ และเลือกจำกัดเฉพาะบางบอทได้
            </p>
            <Code>{"Authorization: Bearer wbot_live_YOUR_API_KEY"}</Code>
            <p>
              ส่งกุญแจจากระบบหลังบ้านหรือระบบอัตโนมัติที่เชื่อถือได้
              หากเป็นเว็บไซต์สาธารณะ ให้ใช้หน้าบอทสาธารณะหรือโค้ดฝังบอท
            </p>
          </Panel>
          <Panel title="2. เรียกใช้งานบอท">
            <p>เผยแพร่บอท แล้วเปิดการเชื่อมต่อ API ในหน้าเผยแพร่</p>
            <Code>{`POST ${apiUrl}/api-run`}</Code>
            <Code>{sample.curl}</Code>
          </Panel>
          <Panel title="3. อ่านผลลัพธ์">
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
              ตัวอย่างรูปแบบคำตอบ เวลาและรหัสคำขอจริงจะแตกต่างกันในแต่ละครั้ง
            </p>
          </Panel>
          <Panel title="JavaScript บนเซิร์ฟเวอร์">
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
              สร้างแพ็กเกจ SDK ที่ให้มากับโปรเจกต์ แล้วติดตั้งจากภายในโปรเจกต์ของคุณ
              ระบบจะไม่เผยแพร่แพ็กเกจนี้ขึ้น npm โดยอัตโนมัติ
            </p>
          </Panel>
          <Panel title="ตรวจสอบลายเซ็น Webhook">
            <p>
              ตรวจสอบ{" "}
              <code>X-WasmBot-Signature: t=TIMESTAMP,v1=HEX_SIGNATURE</code>
              {" "}
              ด้วย HMAC-SHA256 จาก{" "}
              <code>TIMESTAMP + "." + rawRequestBody</code>{" "}
              และรหัสลับ Webhook ของคุณ ปฏิเสธเวลาที่เก่ากว่าห้านาที
              และป้องกันรายการซ้ำด้วย delivery ID
            </p>
          </Panel>
        </div>
        <aside>
          <Panel title="ข้อกำหนดสำคัญของ API">
            <dl>
              <dt>จำนวนเรียก API เริ่มต้น</dt>
              <dd>30 requests/minute/key</dd>
              <dt>จำนวนเรียกผ่านหน้าสาธารณะ</dt>
              <dd>20 requests/minute/IP</dd>
              <dt>ข้อมูลเข้า / ผลลัพธ์</dt>
              <dd>64 KiB each</dd>
              <dt>หน่วยความจำ WASM</dt>
              <dd>32 MiB maximum</dd>
            </dl>
            <p className="muted">
              การตั้งค่าบอทหรือระบบอาจกำหนดเพดานต่ำกว่านี้ เมื่อได้รับ HTTP 429
              ให้รอตามค่า Retry-After ก่อนเรียกใหม่
            </p>
          </Panel>
          <Panel title="สิทธิ์การใช้งาน">
            <p>
              <code>bot:run</code> — เรียกใช้บอทที่เผยแพร่แล้ว
            </p>
            <p>
              <code>bot:read</code> — อ่านรูปแบบข้อมูลของบอทที่เผยแพร่แล้ว
            </p>
            <p>
              <code>execution:read</code>{" "}
              — อ่านประวัติการทำงาน 50 รายการล่าสุด
            </p>
          </Panel>
          <Panel title="รหัสข้อผิดพลาด">
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
        title="โปรไฟล์"
        description="จัดการข้อมูลบัญชีและชื่อที่แสดงในพื้นที่ทำงาน"
      />
      <Panel title="ข้อมูลบัญชี">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await supabase!.from("profiles").update({
                username: name,
              }).eq("id", profile!.id);
              if (error) throw error;
              await refresh();
            }, "บันทึกโปรไฟล์แล้ว");
          }}
        >
          <label>
            ชื่อ<input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            อีเมล<input disabled value={profile?.email || ""} />
          </label>
          <p>
            <Badge>{profile?.role}</Badge>
          </p>
          <div className="actions">
            <button className="primary" disabled={busy}>บันทึกโปรไฟล์</button>
            <Link to="/forgot-password" className="secondary">
              ตั้งรหัสผ่านใหม่
            </Link>
          </div>
        </form>
        <p className="muted">รหัสบัญชี</p>
        <code>{profile?.id}</code> <CopyButton value={profile?.id || ""} />
      </Panel>
    </>
  );
}
