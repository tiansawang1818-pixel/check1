import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
const cwd = new URL("../supabase/functions/wasm-runtime/", import.meta.url);
// Runs only our checked-in Rust compiler project, never user code.
execFileSync("cargo", [
  "build",
  "--release",
  "--target",
  "wasm32-unknown-unknown",
  "--locked",
], { cwd, stdio: "inherit" });
mkdirSync(new URL("pkg/", cwd), { recursive: true });
copyFileSync(
  new URL("target/wasm32-unknown-unknown/release/wasmbot_engine.wasm", cwd),
  new URL("pkg/wasmbot_engine.wasm", cwd),
);
console.log("Rust WASM built. Memory maximum: 32 MiB.");
