// Standalone visual preview. No authentication, database requests or bot execution.
// This entry point is separate from the production application.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Layers3,
  LayoutDashboard,
  Menu,
  Plus,
  Shield,
} from "lucide-react";
import { Builder } from "./components/Builder";
import { Badge, Heading, Metric, Panel } from "./components/ui";
import { ToastProvider, useToast } from "./lib/context";
import "./styles.css";
import "./color-explosion.css";
import { ColorExperience } from "./components/ColorExperience";
import { StudioTools } from "./components/StudioTools";
import { GettingStarted, StudioWelcome } from "./components/StudioWelcome";

const adminLabels: Record<string, string> = {
  Overview: "ภาพรวมระบบ",
  Users: "จัดการผู้ใช้",
  Bots: "จัดการบอท",
  Executions: "ประวัติการทำงาน",
  Reports: "รายงานปัญหา",
  Monitoring: "ติดตามระบบ",
  Logs: "บันทึกผู้ดูแล",
  Settings: "ตั้งค่าระบบ",
};
const isAdminPreview = location.pathname.endsWith("/admin-preview.html");
function Preview() {
  const [page, setPage] = useState(() =>
    isAdminPreview
      ? "admin"
      : location.hash === "#builder"
      ? "builder"
      : "dashboard"
  );
  const [adminTab, setAdminTab] = useState("Overview");
  const [menu, setMenu] = useState(false);
  const notify = useToast();
  const navigate = (next: string) => {
    setPage(next);
    setMenu(false);
  };
  const adminTabs = [
    "Overview",
    "Users",
    "Bots",
    "Executions",
    "Reports",
    "Monitoring",
    "Logs",
    "Settings",
  ];
  return (
    <div
      className={`app-layout ${isAdminPreview ? "admin-shell" : "user-shell"}`}
    >
      <button
        className="mobile-menu secondary"
        aria-label="เปิดเมนู"
        onClick={() => setMenu(!menu)}
      >
        <Menu />
      </button>
      {menu && (
        <button
          className="navigation-backdrop"
          aria-label="ปิดเมนู"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>WasmBot<span>{isAdminPreview ? "Admin" : "Studio"}</span>
        </div>
        <div className="workspace">
          <div className="avatar">W</div>
          <div>
            <strong>ตัวอย่างหน้าจอ</strong>
            <small>ตัวอย่างหน้าตาโปรเจกต์</small>
          </div>
        </div>
        <div className="nav-label">พื้นที่ทำงาน</div>
        <nav>
          {(isAdminPreview
            ? adminTabs.map((tab) => [tab, adminLabels[tab], Shield])
            : [["dashboard", "ภาพรวม", LayoutDashboard], [
              "builder",
              "สร้างบอท",
              Plus,
            ]]).map(([key, label, Icon]) => {
              const NavIcon = Icon as typeof Shield;
              return (
                <a
                  key={String(key)}
                  href={`#${key}`}
                  className={(isAdminPreview ? adminTab === key : page === key)
                    ? "active"
                    : ""}
                  onClick={() => {
                    if (isAdminPreview) {
                      setAdminTab(String(key));
                      setMenu(false);
                    } else navigate(String(key));
                  }}
                >
                  <NavIcon size={19} />
                  {String(label)}
                </a>
              );
            })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-note">
            <Shield size={18} />
            <span>
              Rust WASM engine<small>Rule-based business logic</small>
            </span>
          </div>
          <a href="/">เปิดแอปจริง ↗</a>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>
              {page === "admin" ? "Administration" : "WasmBot Studio"}
            </strong>
          </span>
          {isAdminPreview ? <span className="muted">UI PREVIEW</span> : <StudioTools preview onNavigate={path => navigate(path === "/bots/new" ? "builder" : "dashboard")}/>}
        </header>
        <main className="main">
          <div className="notice" role="status">
            พรีวิวหน้าตาเท่านั้น · ใช้สไตล์และส่วนประกอบจากแอปจริง · ยังไม่เชื่อมข้อมูล ไม่บันทึก
            และไม่รัน Bot
          </div>
          {page === "builder"
            ? (
              <>
                <Heading
                  eyebrow="ไม่ต้องเขียนโค้ด"
                  title="สร้างบอทของคุณ"
                  description="ลองเลือกช่องข้อมูลและตั้งกฎได้ โดยไม่ต้องเขียนโค้ด"
                />
                <Builder
                  onSave={async () => {
                    notify(
                      "ตรวจรูปแบบสำเร็จ — หน้าพรีวิวนี้ไม่บันทึกข้อมูล ต้องเชื่อม Supabase เพื่อสร้าง Bot จริง",
                    );
                  }}
                />
              </>
            )
            : page === "dashboard"
            ? (
              <>
                <StudioWelcome
                  action={
                    <button
                      className="primary"
                      onClick={() => navigate("builder")}
                    >
                      <Plus size={18} />สร้างบอทของฉัน<ArrowRight size={17} />
                    </button>
                  }
                />
                <div className="section-heading">
                  <div>
                    <span className="section-overline">ภาพรวมพื้นที่ทำงาน</span>
                    <h2>ทุกความเคลื่อนไหว ในที่เดียว</h2>
                  </div>
                </div>
                <div className="metrics">
                  {["บอทของฉัน", "จำนวนการใช้งาน", "อัตราสำเร็จ", "การเรียกผ่าน API"]
                    .map((label) => (
                      <Metric
                        key={label}
                        label={label}
                        value="—"
                        note="รอเชื่อม Supabase"
                      />
                    ))}
                </div>
                <div className="dashboard-workspace-grid">
                  <div>
                    <Panel title="การใช้งานของคุณ">
                      <div
                        style={{
                          height: 200,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 12,
                          background:
                            "repeating-linear-gradient(0deg,var(--surface),var(--surface) 39px,var(--line) 40px)",
                        }}
                      >
                        <div
                          style={{
                            background: "var(--surface)",
                            padding: 20,
                            textAlign: "center",
                          }}
                        >
                          <Layers3 color="#5145cd" />
                          <p className="muted" style={{ marginBottom: 0 }}>
                            กราฟจะปรากฏเมื่อมีการรัน Bot จริง
                          </p>
                        </div>
                      </div>
                    </Panel>
                  </div>
                  <GettingStarted
                    action={
                      <button
                        className="text-link"
                        onClick={() => navigate("builder")}
                      >
                        เริ่มสร้างบอท <ArrowRight size={16} />
                      </button>
                    }
                  />
                </div>
                <Heading
                  title="เริ่มต้นจากเรื่องใกล้ตัว"
                  description="ตัวอย่างแนวทางสร้าง Bot — ยังไม่ใช่ Bot ที่บันทึกไว้"
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                    gap: 20,
                  }}
                >
                  {[[
                    "บอทตัดเกรด",
                    "แปลงคะแนนเป็นเกรดด้วยเงื่อนไขที่คุณกำหนด",
                    "Education",
                  ], [
                    "บอทค่าจัดส่ง",
                    "กำหนดค่าจัดส่งตามยอดซื้อและพื้นที่",
                    "Commerce",
                  ], [
                    "บอทสิทธิ์สมาชิก",
                    "กำหนดสิทธิ์และส่วนลดตามประเภทสมาชิก",
                    "Business",
                  ]].map(([name, desc, category]) => (
                    <article className="bot-card" key={name}>
                      <div className="bot-card-top">
                        <span className="bot-icon">
                          <Bot />
                        </span>
                        <Badge>ตัวอย่าง</Badge>
                      </div>
                      <h3>{name}</h3>
                      <p className="muted description">{desc}</p>
                      <div className="bot-card-footer">
                        <span>{category}</span>
                        <button
                          className="text-link"
                          onClick={() =>
                            navigate("builder")}
                        >
                          ลองตั้งเงื่อนไข <ArrowRight size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )
            : (
              <>
                <Heading
                  eyebrow="พื้นที่ผู้ดูแลระบบ"
                  title={adminLabels[adminTab]}
                  description="ดูแลผู้ใช้และ Bot พร้อมตรวจสอบการใช้งานทั้งระบบ"
                />
                {adminTab === "Overview"
                  ? (
                    <>
                      <div className="metrics">
                        {[
                          "ผู้ใช้ทั้งหมด",
                          "ผู้ใช้ที่เปิดใช้งาน",
                          "บอททั้งหมด",
                          "บอทที่เผยแพร่",
                          "การใช้งานวันนี้",
                          "รายงานรอตรวจสอบ",
                        ].map((label) => (
                          <Metric
                            key={label}
                            label={label}
                            value="—"
                            note="รอข้อมูลจริง"
                          />
                        ))}
                      </div>
                      <div className="two-col">
                        <Panel title="การใช้งานย้อนหลัง">
                          <p className="muted">พื้นที่กราฟการรัน Bot ย้อนหลัง 7 วัน</p>
                          <div
                            style={{
                              height: 140,
                              background:
                                "linear-gradient(180deg,#7c3aed24,transparent)",
                              borderRadius: 12,
                            }}
                          />
                        </Panel>
                        <Panel title="ดูแลแพลตฟอร์ม">
                          <p>
                            จัดการสิทธิ์ ระงับบัญชี ตรวจรายงาน และควบคุม Bot ที่เผยแพร่
                          </p>
                          <button
                            className="secondary"
                            onClick={() => setAdminTab("Settings")}
                          >
                            ดูการตั้งค่าระบบ
                          </button>
                        </Panel>
                      </div>
                    </>
                  )
                  : adminTab === "Settings"
                  ? (
                    <Panel title="ตั้งค่าระบบ">
                      <p className="muted">
                        ตัวอย่างช่องตั้งค่า การปรับในหน้านี้ไม่มีผลกับระบบจริง
                      </p>
                      {[["Max bots per user", 20], ["Public rate limit", 20], [
                        "API rate limit",
                        30,
                      ], ["Max API keys", 10]].map(([label, value]) => (
                        <label key={label}>
                          {label}
                          <input type="number" min={1} defaultValue={value} />
                        </label>
                      ))}
                      {[
                        "Allow registration",
                        "Allow public bots",
                        "Allow API",
                        "Allow Embed",
                      ].map((label) => (
                        <label key={label} className="toggle-row">
                          {label}
                          <input type="checkbox" defaultChecked />
                        </label>
                      ))}
                    </Panel>
                  )
                  : (
                    <Panel title={adminLabels[adminTab]}>
                      <p className="muted">
                        แสดงโครงสร้างหน้าจอเท่านั้น — ไม่มีข้อมูลผู้ใช้หรือประวัติจำลอง
                      </p>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              {(adminTab === "Users"
                                ? [
                                  "User",
                                  "Role",
                                  "Status",
                                  "Bots / Runs",
                                  "Actions",
                                ]
                                : adminTab === "Bots"
                                ? [
                                  "Bot",
                                  "Owner",
                                  "Status",
                                  "Channels",
                                  "Actions",
                                ]
                                : adminTab === "Reports"
                                ? [
                                  "Bot",
                                  "Reason",
                                  "Status",
                                  "Created",
                                  "Actions",
                                ]
                                : ["Time", "Target", "Status", "Details"]).map(
                                  (col) => <th key={col}>{col}</th>,
                                )}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td
                                colSpan={5}
                                style={{ textAlign: "center", padding: 48 }}
                              >
                                เชื่อม Supabase และเข้าสู่ระบบด้วยบัญชี Admin เพื่อดูข้อมูล
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  )}
              </>
            )}
        </main>
        <footer className="app-footer">
          WasmBot Studio <span>Build once. Run anywhere.</span>
        </footer>
      </div>
    </div>
  );
}
const previewRoot = createRoot(document.getElementById("root")!);
previewRoot.render(
  <ToastProvider>
    <ColorExperience /><Preview />
  </ToastProvider>,
);
if (import.meta.hot) import.meta.hot.dispose(() => previewRoot.unmount());
