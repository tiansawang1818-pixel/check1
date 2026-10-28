import { PencilStudy } from "./Sketchbook";
import { GalleryWall } from "./GalleryWall";
import { Check, Layers3, Pause, Play } from "lucide-react";
import { useState, type ReactNode } from "react";

export function StudioWelcome({ name, action }: { name?: string; action: ReactNode }) {
  return <><section className="studio-hero" aria-label="เริ่มต้นใช้งานบอท">
    <div className="studio-hero-copy">
      <p className="hero-greeting">{name ? `สวัสดี ${name}` : "ยินดีต้อนรับสู่ WasmBot Studio"}</p>
      <h1>ภาพรวมบอทของคุณ</h1>
      <p className="hero-description">ดูสถิติ เปิดบอทที่มีอยู่ หรือสร้างบอทใหม่จากตัวอย่าง</p>
      <div className="hero-actions">{action}<span><Check size={16} />ไม่ต้องเขียนโค้ด</span></div>

    </div>
    <CircuitVisual />
  </section><GalleryWall /></>;
}

function CircuitVisual() {
  const [paused, setPaused] = useState(false);
  return <div className={`circuit-visual${paused ? " is-paused" : ""}`}>
    <div className="circuit-caption"><span>ภาพร่างหมายเลข 01</span><span>ขั้นตอนการทำงานของบอท</span></div>
    <div className="hero-pencil"><PencilStudy kind="orbit"/></div>
    <div className="circuit-stage" aria-hidden="true">
      <svg viewBox="0 0 440 300" className="circuit-lines" fill="none">
        <circle cx="220" cy="150" r="112" className="circuit-orbit" />
        <circle cx="220" cy="150" r="80" className="circuit-orbit inner" />
        <g className="circuit-tracks">
          <path d="M15 70H100L155 125H220"/><path d="M15 230H100L155 175H220"/>
          <path d="M220 125H285L340 70H425"/><path d="M220 175H285L340 230H425"/>
        </g>
        <g className="circuit-signals">
          <path d="M15 70H100L155 125H220"/><path d="M15 230H100L155 175H220"/>
          <path d="M220 125H285L340 70H425"/><path d="M220 175H285L340 230H425"/>
        </g>
        <g className="circuit-satellite"><circle cx="220" cy="38" r="4"/></g>
        <g className="circuit-points"><circle cx="15" cy="70" r="4"/><circle cx="15" cy="230" r="4"/><circle cx="425" cy="70" r="4"/><circle cx="425" cy="230" r="4"/></g>
      </svg>
      <div className="circuit-core"><Layers3 size={34}/><strong>W</strong><span>ENGINE</span></div>
      <span className="circuit-label input">ข้อมูลเข้า</span><span className="circuit-label output">คำตอบ</span>
    </div>
    <div className="circuit-footer"><span>รับข้อมูล <i>→</i> ตรวจเงื่อนไข <i>→</i> ส่งคำตอบ</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "เล่นภาพเคลื่อนไหว" : "หยุดภาพเคลื่อนไหว"} aria-pressed={paused}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button></div>
  </div>;
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
