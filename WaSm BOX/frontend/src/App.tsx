import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  Component,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
} from "react";
import { configured } from "./lib/api";
import { AuthProvider, ToastProvider } from "./lib/context";
import { AuthPage, Setup } from "./pages/Auth";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";
import { AdminLayout } from "./components/AdminLayout";
const Bots = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Bots }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard }))
);
const BotDetail = lazy(() =>
  import("./pages/BotDetail").then((module) => ({ default: module.BotDetail }))
);
const NewBot = lazy(() =>
  import("./pages/BotDetail").then((module) => ({ default: module.NewBot }))
);
const ExecutionDetail = lazy(() =>
  import("./pages/History").then((module) => ({
    default: module.ExecutionDetail,
  }))
);
const History = lazy(() =>
  import("./pages/History").then((module) => ({ default: module.History }))
);
const ApiKeys = lazy(() =>
  import("./pages/Developer").then((module) => ({ default: module.ApiKeys }))
);
const Developer = lazy(() =>
  import("./pages/Developer").then((module) => ({ default: module.Developer }))
);
const Profile = lazy(() =>
  import("./pages/Developer").then((module) => ({ default: module.Profile }))
);
const PublicBot = lazy(() =>
  import("./pages/PublicBot").then((module) => ({ default: module.PublicBot }))
);
const Admin = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.Admin }))
);
function page(content: ReactNode) {
  return <Suspense fallback={<Loading />}>{content}</Suspense>;
}

class ErrorBoundary
  extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    return this.state.error
      ? (
        <main className="setup">
          <h1>เปิดหน้านี้ไม่สำเร็จ</h1>
          <p>กรุณาโหลดหน้าเว็บใหม่ หากเพิ่งอัปเดตระบบ เบราว์เซอร์อาจยังใช้ไฟล์เวอร์ชันเดิม</p>
          <button onClick={() => location.reload()}>โหลดใหม่</button>
        </main>
      )
      : this.props.children;
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            {!configured ? <Setup /> : (
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                {["login", "register", "forgot-password", "reset-password"].map(
                  (p) => (
                    <Route
                      path={`/${p}`}
                      key={p}
                      element={<AuthPage />}
                    />
                  ),
                )}
                <Route path="/b/:slug" element={page(<PublicBot />)} />
                <Route path="/embed/:slug" element={page(<PublicBot />)} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={page(<Dashboard />)} />
                  <Route path="/bots" element={page(<Bots />)} />
                  <Route path="/bots/new" element={page(<NewBot />)} />
                  <Route path="/bots/:id" element={page(<BotDetail />)} />
                  <Route path="/bots/:id/:tab" element={page(<BotDetail />)} />
                  <Route path="/history" element={page(<History />)} />
                  <Route
                    path="/history/:id"
                    element={page(<ExecutionDetail />)}
                  />
                  <Route path="/developer" element={page(<Developer />)} />
                  <Route
                    path="/developer/api-keys"
                    element={page(<ApiKeys />)}
                  />
                  <Route
                    path="/settings/api-keys"
                    element={<Navigate to="/developer/api-keys" replace />}
                  />
                  <Route path="/profile" element={page(<Profile />)} />
                </Route>
                <Route element={<AdminLayout />}>
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<p>กำลังเปิดหน้าผู้ดูแล…</p>}>
                        <Admin />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/:section"
                    element={
                      <Suspense fallback={<p>กำลังเปิดหน้าผู้ดูแล…</p>}>
                        <Admin />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/:section/:id"
                    element={
                      <Suspense fallback={<p>กำลังเปิดหน้าผู้ดูแล…</p>}>
                        <Admin />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="*"
                  element={
                    <main className="setup">
                      <h1>ไม่พบหน้านี้</h1>
                      <a href="/">กลับพื้นที่ทำงาน</a>
                    </main>
                  }
                />
              </Routes>
            )}
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
