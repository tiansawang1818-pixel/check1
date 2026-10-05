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
type Profile = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status: string;
  avatar_url?: string;
};
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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (request !== generation.current) return;
      if (error) throw error;
      setSession(session);
      if (session) {
        const { data, error } = await supabase.from("profiles").select("*").eq(
          "id", session.user.id,
        ).single();
        if (request !== generation.current) return;
        if (error) throw error;
        setProfile(data);
      }
    } catch (error) {
      if (request === generation.current) {
        setError(error instanceof Error ? error.message : "โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่");
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
            aria-label="Dismiss notification"
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
  async function run(fn: () => Promise<void>, message?: string) {
    setBusy(true);
    try {
      await fn();
      if (message) notify(message);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
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
      if (alive) setError(e.message);
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
