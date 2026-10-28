# ตรวจเตรียมเผยแพร่ 20 ตุลาคม 2026

## งานภาพ
- เปลี่ยนภาพสามชิ้นที่วางทับกันท้ายหน้าเป็นภาพเดียว: โต๊ะศิลปิน → สวนและซุ้มประตู → สะพาน → เมือง
- ภาพอยู่ใน document flow และใช้สัดส่วนจริง จึงไม่วางทับข้อมูลหรือภาพอื่นเมื่อหน้ามีความยาวต่างกัน
- ปิดชั้นภาพตกแต่งแบบ absolute และพื้นหลังภาพซ้อน รวมถึงพื้นหลัง dashboard ที่มีกฎ CSS เฉพาะ
- แก้ Vercel rewrite ให้เว้น /images/ เช่นเดียวกับ /assets/

## ผลตรวจในเครื่อง
- TypeScript frontend/SDK และ ESLint ผ่าน
- Vitest 62 tests ผ่าน
- Configuration tests 10 tests ผ่าน
- PostgreSQL migration/security 34 checks ผ่านด้วย PGlite (ไม่ใช่ฐานข้อมูลบน Supabase จริง)
- WASM 30 checks และ nested AND/OR ผ่าน
- Deno runtime 6 tests ผ่าน
- Deno check ทั้ง 7 Edge Functions ผ่าน
- Vite production build ผ่าน มีคำเตือน bundle ขนาดใหญ่ โดยเฉพาะ advanced editor

## ก่อนเปิดใช้งานจริง
1. ตั้ง VITE_APP_URL เป็น URL HTTPS ของ hosting จริง แล้ว build ใหม่
2. ตั้ง APP_URL ฝั่ง Edge ให้ตรงกัน และ Auth Site URL / Redirect URLs สำหรับ dashboard และ reset-password ให้ตรงโดเมนจริง
3. Deploy frontend จาก root ที่มี package.json (ใน GitHub เดิมคือ WaSm BOX), output dist
4. ทดสอบบนโดเมนจริง: สมัคร/ยืนยันอีเมล เข้าสู่ระบบ สร้าง/รัน/เผยแพร่บอท ลิงก์สาธารณะ API และสิทธิ์ user/admin
5. ตรวจ SMTP, webhook scheduler/Cron และ delivery จริงถ้าจะเปิดฟีเจอร์เหล่านั้น

Production preflight ยังไม่ผ่าน เพราะ URL ปัจจุบันเป็น localhost. การตรวจรอบนี้ไม่เปลี่ยนค่าบน Supabase และไม่ได้ deploy frontend หรือ push Git.

ตรวจภาพจริง: bots และ dashboard บน desktop; developer, bots/new, history, profile บนมือถือ 390px ไม่ล้นหน้าจอ. แก้ตารางมือถือให้เลื่อนในตารางและไม่บีบคำแตกหลายบรรทัด. หน้า admin โหลดข้อมูลจริงสำเร็จ. ยังไม่ได้ทดสอบทุกเส้นทางย่อยหรือการส่งฟอร์มจริงรอบนี้.
