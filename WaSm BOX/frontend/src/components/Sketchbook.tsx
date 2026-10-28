import { useId } from "react";
import { useLocation } from "react-router-dom";
const studies = [
  ["/dashboard", "01", "ห้องทำงานของไอเดีย", "เริ่มจากสิ่งเล็ก ๆ แล้วค่อย ๆ สร้างให้เป็นของคุณ", "orbit"],
  ["/bots/new", "03", "ร่างไอเดียให้เป็นบอท", "เลือกตัวอย่าง · ตั้งเงื่อนไข · ทดลองคำตอบ", "branch"],
  ["/bots", "02", "คอลเลกชันของคุณ", "แต่ละบอท คืออีกหนึ่งไอเดียที่ลงมือสร้าง", "arches"],
  ["/history", "04", "ร่องรอยของการทำงาน", "ย้อนดูผลลัพธ์ เพื่อปรับครั้งต่อไปให้ดีกว่าเดิม", "waves"],
  ["/developer/api-keys", "06", "กุญแจเชื่อมต่อ", "ดูแลทางเข้าออกของผลงานคุณ", "knot"],
  ["/developer", "05", "เชื่อมต่อความเป็นไปได้", "นำบอทของคุณไปใช้ในพื้นที่อื่น", "knot"],
  ["/profile", "07", "ลายเซ็นของคุณ", "พื้นที่เล็ก ๆ ที่เป็นตัวคุณ", "branch"],
  ["/admin", "08", "ดูแลพื้นที่สร้างสรรค์", "ตรวจสอบ จัดระเบียบ และดูแลการใช้งาน", "arches"],
] as const;
export function PencilStudy({kind="orbit"}: {kind?:string}) {
  const id=useId().replace(/:/g, "");
  const drawing=<g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
    {kind === "branch" ? <>
      <path d="M80 178Q120 120 163 26M112 134Q82 113 47 79M130 104Q183 101 223 58M146 70Q115 51 109 20M102 150Q161 157 221 130"/>
      {[[67,94,-40],[88,111,-35],[120,120,30],[175,92,35],[197,76,40],[129,57,-40],[163,148,55],[196,140,60]].map(([x,y,r],i)=><path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 0Q-22-33 0-47Q20-24 0 0M0 0V-40M0-15L-8-25M0-25L7-33"/>)}
    </> : kind === "arches" ? <>
      {[0,1,2,3,4].map(i=><path key={i} d={`M${54+i*29} 166V${91-i*5}Q${82+i*29} ${15-i*4} ${111+i*29} ${91-i*5}V166Z`}/>)}
      <path d="M36 167L237 167M48 176L229 176M62 186L203 186"/>
    </> : kind === "waves" ? <>
      {Array.from({length:15},(_,i)=><path key={i} d={`M25 ${58+i*7}C90 ${-20+i*9} 160 ${205-i*3} 258 ${42+i*8}`}/>)}
      <circle cx="213" cy="42" r="20"/>
    </> : kind === "knot" ? <>
      {[0,30,60,90,120,150].map(r=><ellipse key={r} cx="143" cy="102" rx="91" ry="32" transform={`rotate(${r} 143 102)`}/>)}
      <circle cx="143" cy="102" r="9"/>
    </> : <>
      {[0,35,70].map(r=><ellipse key={r} cx="145" cy="102" rx="95" ry="42" transform={`rotate(${r} 145 102)`}/>)}
      <circle cx="145" cy="102" r="64"/><circle cx="145" cy="102" r="15"/>
      <path d="M27 102H262M145 9V192M52 173L236 32" strokeDasharray="2 7"/>
      <circle cx="232" cy="120" r="5"/><circle cx="107" cy="34" r="4"/>
    </>}
  </g>;
  return <svg className="pencil-study" viewBox="0 0 290 205" aria-hidden="true" focusable="false">
    <defs><pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0V5" stroke="currentColor" strokeWidth=".5"/></pattern></defs>
    <ellipse cx="145" cy="179" rx="104" ry="9" fill={`url(#${id}-hatch)`} opacity=".2"/>
    <g opacity=".28" transform="translate(1.4 -.7)">{drawing}</g>{drawing}
    <path d="M13 22H32M22 13V32M262 182H280M271 173V191" stroke="currentColor" opacity=".3"/>
  </svg>;
}
export function SketchbookPage() {
  const {pathname}=useLocation();
  // The dashboard already has its own illustrated welcome panel.
  if (pathname === "/dashboard") return null;
  const study=studies.find(([path])=>pathname.startsWith(path));
  const [number,title,description,kind]=study ? study.slice(1) : pathname.startsWith('/b/') || pathname.startsWith('/embed/')
    ? ["09","ลองใช้ไอเดียนี้","กรอกข้อมูล แล้วให้บอทช่วยหาคำตอบ","waves"]
    : ["00","ทุกไอเดีย มีจุดเริ่มต้น","เปิดสมุดหน้าใหม่ แล้วเริ่มสร้างไปด้วยกัน","branch"];
  return <section className="sketchbook-page" aria-label="บทนำของหน้า">
    <div><span className="sketchbook-index">WASMBOT ATELIER / {number}</span><p className="sketchbook-title">{title}</p><p className="sketchbook-description">{description}</p></div>
    <img className="page-gallery-art" src={`/images/gallery-${kind === 'branch' ? 'botanical' : kind === 'arches' ? 'architecture' : 'observatory'}.png`} alt="" width="1024" height="1280"/>
  </section>;
}
