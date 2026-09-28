import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bot,
  Code2,
  History,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Shield,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAction, useAuth } from "../lib/context";
import { supabase } from "../lib/api";
import { ErrorBox, Loading } from "./ui";
import { StudioTools } from "./StudioTools";
export function Layout() {
  const navigate = useNavigate();
  const { session, profile, loading, error } = useAuth();
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (error || profile?.status === "SUSPENDED") {
    return (
      <main className="setup">
        <ErrorBox error={error || "Your account is suspended."} />
        <button onClick={() => void supabase?.auth.signOut()}>
          ออกจากระบบ
        </button>
      </main>
    );
  }
  const links = [
    ["/dashboard", "ภาพรวม", LayoutDashboard],
    ["/bots", "บอทของฉัน", Bot],
    ["/bots/new", "สร้างบอท", Plus],
    ["/history", "ประวัติการใช้งาน", History],
    ["/developer", "คู่มือเชื่อมต่อ", Code2],
    ["/developer/api-keys", "กุญแจ API", KeyRound],
    ["/profile", "โปรไฟล์", User],
  ] as const;
  return (
    <div className="app-layout user-shell">
      <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
      <button
        className="mobile-menu secondary"
        aria-label="เปิดหรือปิดเมนู"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <button
          className="navigation-backdrop"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>WasmBot<span>Studio</span>
        </Link>
        <div className="workspace">
          <div className="avatar">
            {(profile?.username || "W").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{profile?.username || "My workspace"}</strong>
            <small>พื้นที่ทำงานส่วนตัว</small>
          </div>
        </div>
        <div className="nav-label">พื้นที่ของคุณ</div>
        <nav>
          {links.map(([to, title, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to !== "/bots"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-note">
            <Shield size={18} />
            <span>
              Powered by Rust WASM<small>Logic runs in isolation</small>
            </span>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const { error } = await supabase!.auth.signOut();
                if (error) throw error;
              })}
          >
            <LogOut size={18} />Sign out
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span>
            พื้นที่ทำงาน <span className="slash">/</span>{" "}
            <strong>WasmBot Studio</strong>
          </span>
          <StudioTools onNavigate={navigate}/>
        </header>
        <main className="main" id="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          WasmBot Studio <span>Build once. Run anywhere.</span>
        </footer>
      </div>
    </div>
  );
}
