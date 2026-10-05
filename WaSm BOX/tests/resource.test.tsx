import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../frontend/src/lib/api", () => ({ api: mocks.api, supabase: null }));
import { useResource } from "../frontend/src/lib/context";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("cancels a previous page read and ignores its late response", async () => {
  let finish!: (value: unknown) => void;
  mocks.api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ page: "new" });
  const { result, rerender } = renderHook(({ path }) => useResource(path), { initialProps: { path: "old" } });
  const oldSignal = mocks.api.mock.calls[0][4].signal;
  rerender({ path: "new" });
  await waitFor(() => expect(result.current.data).toEqual({ page: "new" }));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => finish({ page: "old" }));
  expect(result.current.data).toEqual({ page: "new" });
});
it("clears private data when the resource is disabled", async () => {
  mocks.api.mockResolvedValue({ secret: "private" });
  const { result, rerender } = renderHook(({ path }: { path: string | null }) => useResource(path), { initialProps: { path: "private" as string | null } });
  await waitFor(() => expect(result.current.data).toEqual({ secret: "private" }));
  rerender({ path: null });
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(false);
});
