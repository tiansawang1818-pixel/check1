import {
  ArrowDown,
  ArrowUpRight,
  Bot,
  Check,
  Layers3,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export function StudioWelcome(
  { name, action }: { name?: string; action: ReactNode },
) {
  const [activeStage, setActiveStage] = useState(0);
  return (
    <section className="studio-hero" aria-label="เริ่มต้นใช้งานบอท">
      <div className="studio-hero-copy">
        <span className="hero-eyebrow">
          <span />พื้นที่ของไอเดียที่ทำงานได้จริง
        </span>
        <p className="hero-greeting">
          {name ? `สวัสดี ${name}` : "ยินดีต้อนรับสู่ WasmBot Studio"}
        </p>
        <h1>
          งานซ้ำ ๆ ลดลง<br />
          <em>เวลาให้ไอเดีย เพิ่มขึ้น</em>
        </h1>
        <p className="hero-description">
          เปลี่ยนเงื่อนไขในชีวิตประจำวันให้เป็นบอท<br className="desktop-break" />{" "}
          ตั้งกฎง่าย ๆ แล้วนำไปใช้ได้ทุกที่ โดยไม่ต้องเขียนโค้ด
        </p>
        <div className="hero-actions">
          {action}
          <span>
            <Check size={15} />เริ่มจากตัวอย่างได้เลย
          </span>
        </div>
      </div>
      <div
        className="hero-workflow"
        aria-label="ขั้นตอนการทำงาน: รับข้อมูล ตรวจเงื่อนไข ส่งคำตอบ"
      >
        <div className="workflow-caption">
          <Sparkles size={14} />จากกฎเล็ก ๆ สู่ผู้ช่วยของคุณ
        </div>
        <div className="workflow-node">
          <span className="workflow-node-icon">
            <Layers3 size={20} />
          </span>
          <div>
            <small>01 · เริ่มต้น</small>
            <strong>รับข้อมูลจากผู้ใช้</strong>
          </div>
          <span className="node-dot" />
        </div>
        <ArrowDown className="workflow-arrow" size={20} />
        <div className="workflow-node workflow-engine">
          <span className="workflow-node-icon">
            <Bot size={22} />
          </span>
          <div>
            <small>02 · ประมวลผล</small>
            <strong>ตรวจเงื่อนไขที่คุณตั้งไว้</strong>
          </div>
          <span className="engine-tag">WASM</span>
        </div>
        <ArrowDown className="workflow-arrow" size={20} />
        <div className="workflow-node">
          <span className="workflow-node-icon result-icon">
            <Check size={20} />
          </span>
          <div>
            <small>03 · พร้อมใช้งาน</small>
            <strong>ส่งคำตอบไปยังเว็บหรือแอป</strong>
          </div>
          <ArrowUpRight size={18} />
        </div>
        <div className="workflow-explorer" aria-label="เรียนรู้ขั้นตอนการทำงาน"><div className="workflow-tabs">{["รับข้อมูล", "ตรวจเงื่อนไข", "ส่งคำตอบ"].map((label, index) => <button key={label} aria-pressed={activeStage === index} onClick={() => setActiveStage(index)}>{String(index + 1).padStart(2,"0")} · {label}</button>)}</div><p aria-live="polite">{["คุณกำหนดได้ว่าจะให้กรอกอะไร เช่น ยอดสั่งซื้อหรือจังหวัด", "บอทตรวจตามลำดับ และเลือกคำตอบของข้อแรกที่ตรง", "นำคำตอบไปใช้ได้ผ่านลิงก์สาธารณะ เว็บไซต์ หรือ API"][activeStage]}</p></div>
      </div>
    </section>
  );
}
export function GettingStarted({ action }: { action: ReactNode }) {
  return (
    <aside className="getting-started">
      <span className="section-overline">เริ่มง่ายกว่าที่คิด</span>
      <h2>
        บอทแรกของคุณ<br />เริ่มได้ใน 3 ขั้นตอน
      </h2>
      <ol>
        {[["เลือกเรื่องที่อยากให้ช่วย", "ค่าจัดส่ง ตัดเกรด หรือเลือกส่วนลด"], [
          "บอกเงื่อนไขและคำตอบ",
          "เลือกจากหน้าจอ ไม่ต้องเขียนโค้ด",
        ], ["ทดลอง แล้วค่อยเผยแพร่", "มั่นใจก่อนแชร์ให้คนอื่นใช้งาน"]].map((
          [title, text],
          i,
        ) => (
          <li key={title}>
            <span>{i + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      {action}
    </aside>
  );
}
