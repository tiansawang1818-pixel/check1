import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Command, HelpCircle, Moon, Search, SlidersHorizontal, Sun, X } from "lucide-react";

const destinations = [
  { path: "/dashboard", name: "ภาพรวม", hint: "ดูบอทและสถิติการใช้งาน" },
  { path: "/bots/new", name: "สร้างบอท", hint: "เริ่มจากตัวอย่าง ไม่ต้องเขียนโค้ด" },
  { path: "/bots", name: "บอทของฉัน", hint: "จัดการบอทที่สร้างไว้" },
  { path: "/history", name: "ประวัติการใช้งาน", hint: "ตรวจผลลัพธ์และข้อผิดพลาด" },
  { path: "/developer", name: "คู่มือเชื่อมต่อ", hint: "แชร์ลิงก์ ฝังเว็บ และเรียก API" },
  { path: "/profile", name: "โปรไฟล์", hint: "จัดการข้อมูลบัญชีของคุณ" },
];
function preference(key: string) {
  try { return localStorage.getItem(`wasmbot-ui-${key}`) === "true"; } catch { return false; }
}
export function StudioTools({ onNavigate, preview = false }: { onNavigate: (path: string) => void; preview?: boolean }) {
  const [dark, setDark] = useState(() => preference("dark"));
  const [compact, setCompact] = useState(() => preference("compact"));
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "help">("search");
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const items = destinations.filter(item => (!preview || ["/dashboard", "/bots/new"].includes(item.path)) && `${item.name} ${item.hint}`.includes(query.trim()));
  useEffect(() => {
    const shell = host.current?.closest<HTMLElement>(".user-shell");
    if (shell) { shell.dataset.studioTheme = dark ? "dark" : "light"; shell.dataset.density = compact ? "compact" : "comfortable"; }
    try { localStorage.setItem("wasmbot-ui-dark", String(dark)); localStorage.setItem("wasmbot-ui-compact", String(compact)); } catch { /* Preferences are optional. */ }
  }, [dark, compact]);
  const open = (next: "search" | "help") => {
    trigger.current = document.activeElement as HTMLElement;
    setMode(next); setQuery(""); dialog.current?.showModal();
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); open("search"); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const close = () => dialog.current?.close();
  return <div className="studio-tools" ref={host}>
    <button className="command-launch" onClick={() => open("search")} aria-label="เปิดเมนูลัด"><Search size={16}/><span>ไปที่…</span><kbd>⌘ / Ctrl K</kbd></button>
    <button className="tool-button" onClick={() => setDark(!dark)} aria-label={dark ? "ใช้โหมดสว่าง" : "ใช้โหมดมืด"} title={dark ? "ใช้โหมดสว่าง" : "ใช้โหมดมืด"}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
    <button className="tool-button density-toggle" onClick={() => setCompact(!compact)} aria-pressed={compact} aria-label="แสดงแบบกระชับ" title="แสดงแบบกระชับ"><SlidersHorizontal size={18}/></button>
    <button className="tool-button" onClick={() => open("help")} aria-label="คำแนะนำการใช้งาน" title="คำแนะนำการใช้งาน"><HelpCircle size={18}/></button>
    <dialog ref={dialog} className="studio-dialog" aria-labelledby="studio-dialog-title" onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="studio-dialog-inner"><header><div><span className="section-overline">WASMBOT STUDIO</span><h2 id="studio-dialog-title">{mode === "search" ? "อยากไปทำอะไรต่อ?" : "บอทแรก เริ่มแบบไหนดี?"}</h2></div><button className="tool-button" onClick={close} aria-label="ปิดหน้าต่าง"><X size={20}/></button></header>
      {mode === "search" ? <><label className="command-search"><Search size={20}/><input ref={search} autoFocus aria-label="ค้นหาเมนู" placeholder="พิมพ์ชื่อหน้า เช่น สร้างบอท" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="command-results">{items.map(item => <button key={item.path} onClick={() => { close(); onNavigate(item.path); }}><span><strong>{item.name}</strong><small>{item.hint}</small></span><ArrowUpRight size={18}/></button>)}{!items.length && <p role="status">ไม่พบเมนู ลองค้นด้วยคำสั้น ๆ เช่น “บอท”</p>}</div><footer><Command size={14}/> ใช้ Tab เลือกเมนู · Enter เพื่อเปิด · Esc เพื่อปิด</footer></> : <><div className="help-examples">{[["01", "เลือกงานเล็ก ๆ ที่ทำบ่อย", "เช่น ตัดเกรด หรือกำหนดค่าจัดส่ง เลือกตัวอย่างเพื่อเริ่มได้ทันที"],["02", "บอกว่าถ้าเจอแบบนี้ ให้ตอบอะไร", "เช่น ยอดซื้อถึง 1,000 บาท ให้ตอบค่าส่ง 0 บาท บอทใช้ข้อแรกที่ตรงเงื่อนไข"],["03", "ทดลองก่อน แล้วค่อยเผยแพร่", "ลองหลายกรณีเพื่อเช็กคำตอบ จากนั้นเผยแพร่เพื่อแชร์ลิงก์หรือฝังเว็บ"]].map(([number,title,detail]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div><div className="help-note"><Check size={17}/>ไม่ต้องเขียนโค้ด และแก้ฉบับร่างก่อนเผยแพร่ได้</div><button className="primary full" onClick={() => { close(); onNavigate("/bots/new"); }}>ไปสร้างบอทของฉัน <ArrowUpRight size={17}/></button></>}
      </div>
    </dialog>
  </div>;
}
