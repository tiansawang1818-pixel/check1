import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), single: vi.fn(), callback: null as null | ((event: string, session: unknown) => void) }));
vi.mock("../frontend/src/lib/api", () => ({
  api: vi.fn(),
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback: typeof mocks.callback) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  },
}));
import { AuthProvider, useAuth } from "../frontend/src/lib/context";
function State() {
  const { profile, session, loading, error } = useAuth();
  return <div>{JSON.stringify({ profile, session, loading, error })}</div>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("does not restore an old admin profile after signing out during a read", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "old" } } }, error: null });
  let finish!: (value: unknown) => void;
  mocks.single.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><State /></AuthProvider>);
  await waitFor(() => expect(mocks.single).toHaveBeenCalled());
  act(() => mocks.callback?.("SIGNED_OUT", null));
  await act(async () => finish({ data: { id: "old", role: "ADMIN" }, error: null }));
  expect(screen.getByText(/"loading":false/).textContent).toContain('"profile":null,"session":null');
});
it("stops loading when reading the session rejects", async () => {
  mocks.getSession.mockRejectedValue(new Error("Session unavailable"));
  render(<AuthProvider><State /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/Session unavailable/).textContent).toContain('"loading":false'));
});
