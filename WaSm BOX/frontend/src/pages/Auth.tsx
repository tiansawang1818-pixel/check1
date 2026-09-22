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
    ? "Create your workspace"
    : mode === "/forgot-password"
    ? "Reset your password"
    : mode === "/reset-password"
    ? "Choose a new password"
    : "Welcome back";
  return (
    <div className="auth-layout">
      <aside className="auth-art">
        <Link className="brand" to="/">
          <Layers3 />WasmBot<span>Studio</span>
        </Link>
        <div>
          <div className="eyebrow">YOUR LOGIC. EVERYWHERE.</div>
          <h1>
            One bot.<br />Every possibility.
          </h1>
          <p>
            Build your business rules once. Put them to work across your
            products.
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
          <ShieldCheck size={18} /> Isolated execution. Versioned releases.
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="eyebrow">WASMBOT STUDIO</div>
          <h1>{title}</h1>
          <p className="muted">
            {mode === "/login"
              ? "Sign in to manage your bots and deployments."
              : "Your workspace for reusable business logic."}
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
                    "Check your email to confirm your account, then sign in.",
                  );
                } else if (mode === "/forgot-password") {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    { redirectTo: `${appUrl}/reset-password` },
                  );
                  if (error) throw error;
                  setMessage(
                    "If an account exists, a password reset link has been sent.",
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
                Name<input
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
                Email<input
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
                Password<input
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
                ? "Please wait…"
                : mode === "/login"
                ? "Sign in"
                : mode === "/register"
                ? "Create account"
                : mode === "/forgot-password"
                ? "Send reset link"
                : "Update password"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-links">
            {mode === "/login"
              ? (
                <>
                  <Link to="/forgot-password">Forgot password?</Link>
                  <span>
                    New here? <Link to="/register">Create an account</Link>
                  </span>
                </>
              )
              : <Link to="/login">Back to sign in</Link>}
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
