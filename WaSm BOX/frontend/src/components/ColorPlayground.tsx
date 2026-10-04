import { useState } from "react";
import { ArrowUpRight, Lightbulb, WandSparkles, FlaskConical, Globe2, Palette, Sparkles } from "lucide-react";

const steps = [
  { icon: Lightbulb, word: "IDEA", title: "เริ่มจากเรื่องที่ทำซ้ำ", detail: "เลือกงานที่มีกฎชัดเจน เช่น คิดค่าส่งหรือตัดเกรด แล้วบอกว่าต้องรับข้อมูลอะไร", chips: ["ยอดสั่งซื้อ", "จังหวัด", "คะแนน"] },
  { icon: WandSparkles, word: "BUILD", title: "เปลี่ยนไอเดียเป็นเงื่อนไข", detail: "เลือกช่องข้อมูล ตั้งเงื่อนไข และกำหนดคำตอบผ่านแบบฟอร์มภาษาไทย", chips: ["ถ้าตรงเงื่อนไข", "ให้ตอบแบบนี้", "ไม่ต้องเขียนโค้ด"] },
  { icon: FlaskConical, word: "TEST", title: "ลองให้ครบ ก่อนใช้งาน", detail: "เมื่อเชื่อมระบบพร้อมแล้ว ทดลองข้อมูลหลายแบบ และตรวจว่าผลลัพธ์ตรงกับที่ต้องการ", chips: ["กรณีทั่วไป", "ค่าขอบเขต", "ข้อมูลไม่ครบ"] },
  { icon: Globe2, word: "SHARE", title: "ส่งต่อผู้ช่วยของคุณ", detail: "เมื่อทดสอบและเผยแพร่แล้ว เลือกแชร์ลิงก์ ฝังในเว็บไซต์ หรือเชื่อมต่อผ่าน API", chips: ["ลิงก์สาธารณะ", "Embed", "API"] },
];
const palettes = ["violet", "ocean", "sunset"];
export function ColorPlayground() {
  const [stage, setStage] = useState(0);
  const [palette, setPalette] = useState(0);
  const [pulse, setPulse] = useState(0);
  const current = steps[stage];
  const Icon = current.icon;
  return <section className="color-playground" data-palette={palettes[palette]} aria-label="สำรวจเส้นทางสร้างบอท">
    <header className="playground-header"><div><span className="section-overline">YOUR NEXT BIG IDEA</span><h2>จากไอเดีย สู่ผู้ช่วยของคุณ<span>✳</span></h2><p>กดเลือกแต่ละขั้น แล้วลองเล่นกับสีได้เลย</p></div><div className="playground-controls">
      <button type="button" onClick={() => setPalette((palette + 1) % palettes.length)} aria-label="เปลี่ยนชุดสีลูกเล่น"><Palette size={16} />เปลี่ยนสี <span className="palette-dots" aria-hidden="true"><i /><i /><i /></span></button>
      <button type="button" data-color-burst onClick={() => setPulse(pulse + 1)}><Sparkles size={16} />ระเบิดสี</button>
    </div></header>
    <div className="journey-rail" role="group" aria-label="เลือกขั้นตอนเพื่อดูคำอธิบาย">
      {steps.map((step, index) => <button type="button" key={step.word} className="journey-stop" aria-pressed={stage === index} onClick={() => setStage(index)}><span className="journey-number">0{index + 1}</span><step.icon size={22} /><strong>{step.word}</strong><span>{step.title}</span><ArrowUpRight size={18} className="journey-arrow" /></button>)}
    </div>
    <div className="journey-detail" data-stage={stage}>
      <div className="journey-sculpture" aria-hidden="true"><div className="sculpture-halo" /><div className="sculpture-ring" /><div className="sculpture-ring ring-cross" /><div className="sculpture-core"><Icon size={38} /></div><span className="sculpture-label">{current.word}</span><div key={pulse} className={pulse ? "color-shockwave" : ""} /></div>
      <div key={stage} className="journey-copy" aria-live="polite"><span className="section-overline">0{stage + 1} / {current.word}</span><h3>{current.title}</h3><p>{current.detail}</p><div className="journey-chips">{current.chips.map(chip => <span key={chip}>{chip}</span>)}</div></div>
    </div>
    <footer>พื้นที่สำรวจไอเดีย · เอฟเฟกต์นี้ไม่ได้สร้างหรือรันบอท <span aria-hidden="true">✦ MAKE IT YOURS ✦</span></footer>
  </section>;
}
