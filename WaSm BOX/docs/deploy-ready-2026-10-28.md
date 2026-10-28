# Deploy readiness — 2026-10-28

## พร้อมในโค้ด

- หน้าเว็บใช้ธีม production เดียวกันทั้งพื้นที่ผู้ใช้ ผู้ดูแล Auth และหน้าบอทสาธารณะ
- รองรับ desktop/mobile, keyboard focus, reduced motion และตารางเลื่อนบนจอเล็ก
- Vercel มี SPA rewrites, security headers และ immutable cache สำหรับไฟล์ที่มี hash
- มีตัวอย่างค่าตั้งต้นสำหรับ frontend และ Supabase Edge secrets โดยไม่มีค่าลับจริง
- Edge Functions ทั้งเจ็ดและ WASM runtime มีสคริปต์ตรวจและขั้นตอน deploy ใน README

## ค่าที่เจ้าของระบบต้องใส่ก่อน deploy frontend

1. ตั้ง `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` บน Vercel
2. ตั้ง `VITE_APP_URL` เป็นโดเมน HTTPS จริง เช่น `https://wasmbot.example.com`
3. ตั้ง Supabase Auth Site URL เป็นโดเมนเดียวกัน และเพิ่ม `/reset-password` ใน Redirect URLs
4. ให้ค่า `APP_URL` ของ Edge secrets ตรงกับ `VITE_APP_URL`
5. รัน production preflight แล้วทดสอบสมัคร → สร้าง → ทดลอง → เผยแพร่ → Public/API บนโดเมนจริง

ใช้ `.env.production.example` และ `.env.edge.production.example` เป็นรายการตัวแปร ห้าม commit ไฟล์ที่มีค่าจริง
