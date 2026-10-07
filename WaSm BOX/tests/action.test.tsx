import React from "react";
import { act, cleanup, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../frontend/src/lib/api", () => ({ api: vi.fn(), supabase: null }));
import { ToastProvider, useAction } from "../frontend/src/lib/context";
afterEach(cleanup);
it("sends only one mutation when invoked twice before rendering", async () => {
  const { result } = renderHook(() => useAction());
  let finish!: () => void;
  const mutation = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  let first!: Promise<void>;
  act(() => {
    first = result.current.run(mutation);
    void result.current.run(mutation);
  });
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(result.current.busy).toBe(true);
  await act(async () => { finish(); await first; });
  expect(result.current.busy).toBe(false);
  await act(async () => { await result.current.run(async () => {}); });
});
it("releases the lock after failure and reports non-Error rejections", async () => {
  const { result } = renderHook(() => useAction(), {
    wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
  });
  await act(async () => { await result.current.run(async () => { throw null; }); });
  expect(screen.getByRole("alert").textContent).toContain("ดำเนินการไม่สำเร็จ");
  expect(result.current.busy).toBe(false);
  const retry = vi.fn().mockResolvedValue(undefined);
  await act(async () => { await result.current.run(retry); });
  expect(retry).toHaveBeenCalledTimes(1);
});
