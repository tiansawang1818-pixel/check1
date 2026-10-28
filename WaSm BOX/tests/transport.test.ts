import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "../frontend/src/lib/transport";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("API transport", () => {
  it("returns a successful envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }))));
    expect(await requestJson("/test", {})).toEqual({ success: true, data: [] });
  });
  it("explains an undeployed function gateway response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "NOT_FOUND" }), { status: 404 })));
    await expect(requestJson("/test", {})).rejects.toThrow("Edge Functions");
  });
  it("translates a known server error code without exposing its English message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "BOT_DISABLED", message: "Bot disabled" },
    }), { status: 403 })));
    await expect(requestJson("/test", {})).rejects.toThrow(
      "บอทนี้ถูกปิดใช้งานชั่วคราว",
    );
  });
  it("gives a useful Thai message when the WASM runtime rejects execution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "WASM_ERROR", message: "Execution failed" },
    }), { status: 422 })));
    await expect(requestJson("/test", {})).rejects.toThrow(
      "บอทประมวลผลไม่สำเร็จ",
    );
  });
  it("handles HTML proxy responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>error</html>", { status: 502 })));
    await expect(requestJson("/test", {})).rejects.toThrow("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง");
  });
  it("handles network failure without retrying a write", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Load failed"));
    vi.stubGlobal("fetch", fetcher);
    await expect(requestJson("/test", { method: "POST" })).rejects.toThrow("เชื่อมต่อบริการไม่ได้");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("aborts a timed out request", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const result = expect(requestJson("/test", {}, { timeoutMs: 50 })).rejects.toThrow("รอเซิร์ฟเวอร์นานเกินไป");
    await vi.advanceTimersByTimeAsync(50);
    await result;
  });
  it("preserves caller cancellation", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const result = expect(requestJson("/test", {}, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await result;
  });
});
