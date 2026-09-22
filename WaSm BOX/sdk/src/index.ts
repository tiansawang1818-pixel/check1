export interface WasmBotOptions {
  supabaseUrl: string;
  bot: string;
  apiKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}
export interface Execution {
  executionTimeMs: number;
  requestId: string;
  version: number;
  memoryUsed: number;
}
export interface RunResult<T> {
  success: true;
  data: T;
  execution: Execution;
}
export class WasmBotError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = "WasmBotError";
  }
}
/** Keep API keys on your server. Use the public page/widget for untrusted browsers. */
export class WasmBot {
  private options: WasmBotOptions;
  constructor(options: WasmBotOptions) {
    new URL(options.supabaseUrl);
    this.options = options;
  }
  async run<T = unknown>(
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<RunResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 15000,
    );
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    try {
      const response = await (this.options.fetch ?? fetch)(
        `${this.options.supabaseUrl.replace(/\/$/, "")}/functions/v1/api-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.options.apiKey}`,
          },
          body: JSON.stringify({ bot: this.options.bot, input }),
          signal: controller.signal,
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new WasmBotError(
          result.error?.code ?? "HTTP_ERROR",
          result.error?.message ?? `HTTP ${response.status}`,
          response.status,
          result.requestId,
        );
      }
      return result as RunResult<T>;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
}
