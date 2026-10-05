import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z_0-9]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    values[match[1]] = value;
  }
  return values;
}
const webUrl = (value) => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash; }
  catch { return false; }
};
export function inspectConfig(frontend, edge) {
  const checks = [];
  const add = (name, pass, help) => checks.push({ name, pass: Boolean(pass), help });
  add('VITE_SUPABASE_URL', webUrl(frontend.VITE_SUPABASE_URL), 'ใส่ Project URL จาก Supabase');
  const key = frontend.VITE_SUPABASE_ANON_KEY || '';
  let publicKey = key.startsWith('sb_publishable_') && key.length > 20;
  if (key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { publicKey = false; }
  }
  add('VITE_SUPABASE_ANON_KEY', publicKey, 'ใช้ publishable key หรือ legacy anon key เท่านั้น');
  add('VITE_APP_URL', webUrl(frontend.VITE_APP_URL), 'ระบุ URL ของเว็บให้ตรงกับ Auth Site URL และ Redirect URLs');
  for (const [name, value] of Object.entries(frontend)) {
    if (name.startsWith('VITE_') && (/SERVICE_ROLE|SECRET|PRIVATE|ENCRYPTION/.test(name) || value.startsWith('sb_secret_'))) {
      add(`ห้ามเปิดเผยตัวแปร ${name}`, false, 'นำค่าลับออกจาก frontend และเก็บใน Edge secrets');
    }
  }
  if (edge) {
    for (const name of ['API_KEY_HASH_SECRET', 'WEBHOOK_SIGNING_SECRET']) add(name, (edge[name] || '').length >= 32, 'ตั้งค่าสุ่มแยกกันอย่างน้อย 32 ตัวอักษร');
    const encryption = edge.WEBHOOK_ENCRYPTION_KEY || '';
    add('WEBHOOK_ENCRYPTION_KEY', /^[A-Za-z0-9+/]{43}=$/.test(encryption) && Buffer.from(encryption, 'base64').length === 32, 'ใช้สุ่ม 32 bytes ในรูป base64');
    add('APP_URL', webUrl(edge.APP_URL) && edge.APP_URL.replace(/\/$/, '') === frontend.VITE_APP_URL?.replace(/\/$/, ''), 'ให้ URL ตรงกับ VITE_APP_URL');
    add('แยก HMAC secrets', Boolean(edge.API_KEY_HASH_SECRET) && edge.API_KEY_HASH_SECRET !== edge.WEBHOOK_SIGNING_SECRET, 'ใช้ค่าสุ่มคนละค่าสำหรับ API keys และ webhook scheduler');
  }
  return checks;
}
export async function preflight(root, frontendPath = '.env', edgePath = '.env.edge') {
  const load = async (path) => {
    try { return parseEnv(await readFile(resolve(root, path), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const frontend = await load(frontendPath);
  const edge = await load(edgePath);
  const checks = inspectConfig(frontend || {}, edge);
  let wasm = false;
  try {
    const bytes = await readFile(resolve(root, 'supabase/functions/wasm-runtime/pkg/wasmbot_engine.wasm'));
    wasm = bytes.length > 8 && bytes.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109]));
  } catch { /* Report missing build output below. */ }
  checks.push({ name: 'WASM artifact', pass: wasm, help: 'รัน pnpm build:wasm ก่อน deploy ฟังก์ชันที่ใช้ WASM' });
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.pass ? '' : ` — ${check.help}`}`);
  if (!edge) console.log('UNKNOWN Edge secrets — ไม่มีไฟล์ .env.edge; อาจตั้งค่าบน Supabase แล้ว แต่เครื่องมือนี้ยังยืนยันไม่ได้');
  console.log('UNKNOWN Hosted readiness — ยังไม่ได้ตรวจ migration, RLS, Auth, Edge Functions, Cron หรือทดสอบสร้าง/รัน/เผยแพร่บอทจริง');
  console.log('ผลนี้ตรวจไฟล์ในเครื่องเท่านั้น ไม่ยืนยันว่า deploy สำเร็จ และไม่แสดงค่าคีย์');
  return checks.every(check => check.pass) && Boolean(edge);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = await preflight(process.cwd(), process.argv[2], process.argv[3]) ? 0 : 1; }
  catch { console.error('ตรวจไฟล์ไม่สำเร็จ กรุณาตรวจสิทธิ์อ่านไฟล์ตั้งค่า'); process.exitCode = 1; }
}
