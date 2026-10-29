import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { api, supabase } from "./api";
import { friendlyError } from "./errors";
type Profile = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status: string;
  avatar_url?: string;
};
const AUTH_READ_TIMEOUT_MS = 12_000;

class SessionCheckTimeoutError extends Error {
  constructor() {
    super("Session check timed out");
    this.name = "SessionCheckTimeoutError";
  }
}

async function within<T>(
  value: PromiseLike<T>,
  timeoutMs: number,
  timeoutError: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(value),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function isExpiredSession(error: unknown) {
  if (error instanceof SessionCheckTimeoutError) return true;
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  const message = error instanceof Error ? error.message : String(error || "");
  return status === 401 ||
    /auth session missing|invalid refresh token|refresh token.*not found|session.*expired|jwt expired/i
      .test(message);
}
const AuthContext = createContext<
  {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
  }
>({
  session: null,
  profile: null,
  loading: true,
  error: "",
  refresh: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setProfile(null);
    setError("");
    try {
      if (!supabase) return;
      const { data: { session }, error } = await within(
        supabase.auth.getSession(),
        AUTH_READ_TIMEOUT_MS,
        () => new SessionCheckTimeoutError(),
      );
      if (request !== generation.current) return;
      if (error) throw error;
      setSession(session);
      if (session) {
        const { data, error } = await within(
          supabase.from("profiles").select("*").eq(
            "id",
            session.user.id,
          ).single(),
          AUTH_READ_TIMEOUT_MS,
          () => new Error("Profile read timed out"),
        );
        if (request !== generation.current) return;
        if (error) throw error;
        setProfile(data);
      }
    } catch (error) {
      if (request === generation.current) {
        if (isExpiredSession(error)) {
          setSession(null);
          setProfile(null);
          setError("");
          void supabase?.auth.signOut({ scope: "local" });
        } else {
          setError(friendlyError(error, "โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่"));
        }
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      // Invalidate pending profile reads immediately, including on sign-out.
      ++generation.current;
      setSession(session);
      setProfile(null);
      setError("");
      setLoading(Boolean(session));
      clearTimeout(timer);
      if (session) timer = setTimeout(() => void refresh(), 0);
    });
    return () => {
      ++generation.current;
      clearTimeout(timer);
      subscription?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  return (
    <AuthContext.Provider value={{ session, profile, loading, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<
    { message: string; error: boolean } | null
  >(null);
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.message}
          <button
            aria-label="ปิดการแจ้งเตือน"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function useAction() {
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  const inFlight = useRef(false);
  async function run(fn: () => Promise<void>, message?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await fn();
      if (message) notify(message);
    } catch (e) {
      notify(friendlyError(e), true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
export function useResource<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setData(null);
    setError("");
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    void api<T>(path, "GET", undefined, undefined, { signal: controller.signal }).then((d) => {
      if (alive) setData(d);
    }).catch((e) => {
      if (alive) setError(friendlyError(e, "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่"));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [path, revision]);
  return { data, error, loading, reload };
}
