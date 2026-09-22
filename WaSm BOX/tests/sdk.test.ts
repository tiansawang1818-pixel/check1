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
