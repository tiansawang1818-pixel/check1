import { expect, it, vi } from "vitest";
import { WasmBot, WasmBotError } from "../sdk/src/index";
it("sends correct API payload and preserves response metadata", async () => {
  const response = {
    success: true,
    data: "A",
    execution: {
      requestId: "r",
      executionTimeMs: 1,
      version: 1,
      memoryUsed: 1,
    },
  };
  const transport = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response)),
  );
  const bot = new WasmBot({
    supabaseUrl: "https://project.supabase.co/",
    bot: "grade",
    apiKey: "key",
    fetch: transport,
  });
  expect(await bot.run({ score: 85 })).toEqual(response);
  const [url, request] = transport.mock.calls[0];
  expect(url).toBe("https://project.supabase.co/functions/v1/api-run");
  expect(JSON.parse(request.body)).toEqual({
    bot: "grade",
    input: { score: 85 },
  });
  expect(request.headers.Authorization).toBe("Bearer key");
});
it("surfaces structured revoked-key errors", async () => {
  const bot = new WasmBot({
    supabaseUrl: "https://project.supabase.co",
    bot: "grade",
    apiKey: "revoked",
    fetch: async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "API_KEY_REVOKED", message: "Revoked" },
          requestId: "r",
        }),
        { status: 401 },
      ),
  });
  await expect(bot.run({})).rejects.toBeInstanceOf(WasmBotError);
});

it("does not send an already cancelled request", async () => {
  const transport = vi.fn();
  const controller = new AbortController();
  controller.abort();
  const bot = new WasmBot({
    supabaseUrl: "https://example.com",
    bot: "grade",
    apiKey: "secret",
    fetch: transport,
  });
  await expect(bot.run({}, controller.signal)).rejects.toMatchObject({
    code: "ABORTED",
  });
  expect(transport).not.toHaveBeenCalled();
});
it("reports malformed gateway responses without exposing their contents", async () => {
  const bot = new WasmBot({
    supabaseUrl: "https://example.com",
    bot: "grade",
    apiKey: "secret",
    fetch: async () =>
      new Response("<html>private upstream detail</html>", { status: 502 }),
  });
  await expect(bot.run({})).rejects.toMatchObject({
    code: "INVALID_RESPONSE",
    status: 502,
  });
});
it("reports network failures without retrying execution", async () => {
  const transport = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
  const bot = new WasmBot({
    supabaseUrl: "https://example.com",
    bot: "grade",
    apiKey: "secret",
    fetch: transport,
  });
  await expect(bot.run({})).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  expect(transport).toHaveBeenCalledTimes(1);
});
it("distinguishes timeout from user cancellation", async () => {
  vi.useFakeTimers();
  try {
    const transport = vi.fn((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
        );
      })
    );
    const bot = new WasmBot({
      supabaseUrl: "https://example.com",
      bot: "grade",
      apiKey: "secret",
      timeoutMs: 50,
      fetch: transport,
    });
    const pending = expect(bot.run({})).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(50);
    await pending;
  } finally {
    vi.useRealTimers();
  }
});
it("rejects unsafe URL schemes and invalid timeouts before making requests", () => {
  const options = {
    supabaseUrl: "https://example.com",
    bot: "grade",
    apiKey: "secret",
  };
  expect(() => new WasmBot({ ...options, supabaseUrl: "file:///tmp/test" }))
    .toThrow(WasmBotError);
  expect(() => new WasmBot({ ...options, timeoutMs: NaN })).toThrow(
    WasmBotError,
  );
  expect(() => new WasmBot({ ...options, timeoutMs: 0 })).toThrow(WasmBotError);
});
it("identifies nonserializable input before any network request", async () => {
  const transport = vi.fn();
  const bot = new WasmBot({
    supabaseUrl: "https://example.com",
    bot: "grade",
    apiKey: "secret",
    fetch: transport,
  });
  const input: Record<string, unknown> = {};
  input.self = input;
  await expect(bot.run(input)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect(transport).not.toHaveBeenCalled();
});
