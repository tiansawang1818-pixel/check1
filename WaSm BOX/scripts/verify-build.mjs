import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const assets = resolve(dist, "assets");
const index = await readFile(resolve(dist, "index.html"), "utf8");

if (/AdvancedEditor|monaco|editor\.worker|json\.worker/i.test(index)) {
  throw new Error("ตัวแก้ไขขั้นสูงต้องไม่ถูก preload ในหน้าแรก");
}

const initialFiles = [...index.matchAll(/(?:src|href)="\/?assets\/([^"]+\.js)"/g)]
  .map((match) => match[1]);
const initialBytes = (await Promise.all(
  initialFiles.map(async (file) => (await stat(resolve(assets, file))).size),
)).reduce((total, size) => total + size, 0);
if (initialBytes > 800 * 1024) {
  throw new Error(`JavaScript หน้าแรกเกิน 800 KiB (${initialBytes} bytes)`);
}

for (const file of await readdir(assets)) {
  if (!file.endsWith(".js") || /AdvancedEditor|\.worker-/.test(file)) continue;
  const bytes = (await stat(resolve(assets, file))).size;
  if (bytes > 500 * 1024) {
    throw new Error(`${file} เกินงบ 500 KiB (${bytes} bytes)`);
  }
}

console.log(
  `PASS build budget — initial JavaScript ${(initialBytes / 1024).toFixed(1)} KiB; editor remains lazy`,
);
