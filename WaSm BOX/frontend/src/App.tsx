import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { configured } from "./lib/api";
import { AuthProvider, ToastProvider } from "./lib/context";
import { AuthPage, Setup } from "./pages/Auth";
import { Layout } from "./components/Layout";
import { Bots, Dashboard } from "./pages/Dashboard";
import { BotDetail, NewBot } from "./pages/BotDetail";
import { ExecutionDetail, History } from "./pages/History";
import { ApiKeys, Developer, Profile } from "./pages/Developer";
import { PublicBot } from "./pages/PublicBot";
import { Admin } from "./pages/Admin";
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
          <h1>Something went wrong</h1>
          <p>Reload the page to try again.</p>
          <button onClick={() => location.reload()}>Reload</button>
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
                <Route path="/b/:slug" element={<PublicBot />} />
                <Route path="/embed/:slug" element={<PublicBot />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/bots" element={<Bots />} />
                  <Route path="/bots/new" element={<NewBot />} />
                  <Route path="/bots/:id" element={<BotDetail />} />
                  <Route path="/bots/:id/:tab" element={<BotDetail />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/history/:id" element={<ExecutionDetail />} />
                  <Route path="/developer" element={<Developer />} />
                  <Route path="/developer/api-keys" element={<ApiKeys />} />
                  <Route
                    path="/settings/api-keys"
                    element={<Navigate to="/developer/api-keys" replace />}
                  />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/:section" element={<Admin />} />
                  <Route path="/admin/:section/:id" element={<Admin />} />
                </Route>
                <Route
                  path="*"
                  element={
                    <main className="setup">
                      <h1>Page not found</h1>
                      <a href="/">Back to workspace</a>
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
