import { type ReactNode, useState } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Bot,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../lib/context";
import { ErrorBox, Loading } from "./ui";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading, error } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (error) {
    return (
      <main className="setup">
        <ErrorBox error={error} />
      </main>
    );
  }
  if (!profile || profile.status !== "ACTIVE" || profile.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const links = [
    ["/admin", "ภาพรวมระบบ", LayoutDashboard],
    ["/admin/users", "จัดการผู้ใช้", Users],
    ["/admin/bots", "จัดการบอท", Bot],
    ["/admin/executions", "ประวัติการทำงาน", History],
    ["/admin/reports", "รายงานปัญหา", ClipboardList],
    ["/admin/monitoring", "ติดตามระบบ", Activity],
    ["/admin/logs", "บันทึกผู้ดูแล", History],
    ["/admin/settings", "ตั้งค่าระบบ", Settings],
  ] as const;
  return (
    <AdminGuard>
      <div className="app-layout admin-shell">
        <button
          className="mobile-menu secondary"
          aria-label={open ? "ปิดเมนูผู้ดูแล" : "เปิดเมนูผู้ดูแล"}
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
          <Link to="/admin" className="brand">
            <span className="brand-mark">
              <ShieldCheck size={22} />
            </span>WasmBot<span>Admin</span>
          </Link>
          <div className="admin-workspace">
            <span className="section-kicker">พื้นที่ผู้ดูแลระบบ</span>
            <h2>
              ดูแลทุกอย่าง<br />จากที่เดียว
            </h2>
            <small>เฉพาะบัญชีที่ได้รับสิทธิ์เท่านั้น</small>
          </div>
          <nav aria-label="เมนูผู้ดูแล">
            {links.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Link className="text-link" to="/dashboard">
              <ArrowLeft size={17} />กลับพื้นที่ส่วนตัว
            </Link>
          </div>
        </aside>
        <div className="app-content">
          <header className="topbar">
            <strong>ศูนย์ควบคุมระบบ</strong>
            <span className="admin-label">
              <ShieldCheck size={15} />ผู้ดูแลระบบ
            </span>
          </header>
          <main className="main">
            <Outlet />
          </main>
          <footer className="app-footer">
            WasmBot Admin<span>การเปลี่ยนแปลงถูกบันทึกเพื่อตรวจสอบย้อนหลัง</span>
          </footer>
        </div>
      </div>
    </AdminGuard>
  );
}
