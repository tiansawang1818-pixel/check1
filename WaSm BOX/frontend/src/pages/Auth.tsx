import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Layers3, ShieldCheck } from "lucide-react";
import { appUrl, supabase } from "../lib/api";
import { useAction, useAuth } from "../lib/context";
export function AuthPage() {
  const mode = useLocation().pathname;
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { busy, run } = useAction();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [username, setUsername] = useState(""),
    [message, setMessage] = useState("");
  const title = mode === "/register"
    ? "สร้างพื้นที่ของคุณ"
    : mode === "/forgot-password"
    ? "ขอลิงก์ตั้งรหัสผ่านใหม่"
    : mode === "/reset-password"
    ? "ตั้งรหัสผ่านใหม่"
    : "ยินดีต้อนรับกลับมา";
  return (
    <div className="auth-layout">
      <aside className="auth-art">
        <Link className="brand" to="/">
          <Layers3 />WasmBot<span>Studio</span>
        </Link>
        <div>
          <div className="eyebrow">เปลี่ยนไอเดียให้ทำงานแทนคุณ</div>
          <h1>
            กฎของคุณ<br />ความเป็นไปได้ไม่สิ้นสุด
          </h1>
          <p>
            สร้างบอทจากเงื่อนไขที่คุณรู้จัก แล้วให้บอทช่วยจัดการงานซ้ำ ๆ บนเว็บหรือแอปของคุณ
          </p>
          <div className="flow-visual">
            <span>Input</span>
            <ArrowRight />
            <strong>WASM</strong>
            <ArrowRight />
            <span>Output</span>
          </div>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={18} /> ทดสอบก่อนเผยแพร่ เก็บทุกเวอร์ชันไว้ตรวจสอบ
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="eyebrow">WASMBOT STUDIO</div>
          <h1>{title}</h1>
          <p className="muted">
            {mode === "/login"
              ? "เข้าสู่ระบบเพื่อสร้างและดูแลบอทของคุณ"
              : "เริ่มต้นได้ด้วยการเลือกข้อมูลและตั้งเงื่อนไข ไม่ต้องเขียนโค้ด"}
          </p>
          {message && <div className="notice" role="status">{message}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (!supabase) throw new Error("Supabase is not configured.");
                if (mode === "/register") {
                  const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { username },
                      emailRedirectTo: `${appUrl}/dashboard`,
                    },
                  });
                  if (error) throw error;
                  setMessage(
                    "ตรวจอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ",
                  );
                } else if (mode === "/forgot-password") {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    { redirectTo: `${appUrl}/reset-password` },
                  );
                  if (error) throw error;
                  setMessage(
                    "หากมีบัญชีนี้ในระบบ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ทางอีเมล",
                  );
                } else if (mode === "/reset-password") {
                  const { error } = await supabase.auth.updateUser({
                    password,
                  });
                  if (error) throw error;
                  await refresh();
                  navigate("/dashboard");
                } else {
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error) throw error;
                  await refresh();
                  navigate("/dashboard");
                }
              });
            }}
          >
            {mode === "/register" && (
              <label>
                ชื่อที่แสดง<input
                  required
                  maxLength={100}
                  autoComplete="nickname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
            )}
            {mode !== "/reset-password" && (
              <label>
                อีเมล<input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {mode !== "/forgot-password" && (
              <label>
                รหัสผ่าน<input
                  type="password"
                  minLength={8}
                  required
                  autoComplete={mode === "/login"
                    ? "current-password"
                    : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "กำลังดำเนินการ…"
                : mode === "/login"
                ? "เข้าสู่ระบบ"
                : mode === "/register"
                ? "สร้างบัญชี"
                : mode === "/forgot-password"
                ? "ส่งลิงก์ทางอีเมล"
                : "บันทึกรหัสผ่านใหม่"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-links">
            {mode === "/login"
              ? (
                <>
                  <Link to="/forgot-password">ลืมรหัสผ่าน?</Link>
                  <span>
                    ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
                  </span>
                </>
              )
              : <Link to="/login">กลับไปเข้าสู่ระบบ</Link>}
          </div>
        </div>
      </main>
    </div>
  );
}
export function Setup() {
  return (
    <main className="setup">
      <Layers3 size={42} />
      <h1>Connect WasmBot Studio</h1>
      <p>
        The application needs a real Supabase project before you can sign in or
        create bots.
      </p>
      <ol>
        <li>
          Copy <code>.env.example</code> to <code>.env</code>.
        </li>
        <li>Set your Supabase project URL and public anon key.</li>
        <li>
          Apply the migration, build WASM, and deploy Edge Functions using the
          README.
        </li>
        <li>Restart the frontend.</li>
      </ol>
      <p className="muted">
        Never put your service-role key in the frontend environment.
      </p>
    </main>
  );
}
