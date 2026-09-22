import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
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
export function Layout() {
  const { session, profile, loading, error } = useAuth();
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (error || profile?.status === "SUSPENDED") {
    return (
      <main className="setup">
        <ErrorBox error={error || "Your account is suspended."} />
        <button onClick={() => void supabase?.auth.signOut()}>Sign out</button>
      </main>
    );
  }
  const links = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/bots", "My bots", Bot],
    ["/bots/new", "Create bot", Plus],
    ["/history", "Executions", History],
    ["/developer", "Developer", Code2],
    ["/developer/api-keys", "API keys", KeyRound],
    ["/profile", "Profile", User],
  ] as const;
  return (
    <div className="app-layout">
      <button
        className="mobile-menu secondary"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
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
            <small>Personal workspace</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
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
          {profile?.role === "ADMIN" && (
            <NavLink to="/admin">
              <Shield size={19} />Admin panel
            </NavLink>
          )}
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
            Workspace <span className="slash">/</span>{" "}
            <strong>WasmBot Studio</strong>
          </span>
          <Link to="/developer" className="muted">Documentation ↗</Link>
        </header>
        <main className="main">
          <Outlet />
        </main>
        <footer className="app-footer">
          WasmBot Studio <span>Build once. Run anywhere.</span>
        </footer>
      </div>
    </div>
  );
}
