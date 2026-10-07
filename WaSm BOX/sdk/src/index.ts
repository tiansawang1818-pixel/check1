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
    const url = new URL(options.supabaseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) || url.username ||
      url.password || url.search || url.hash
    ) {
      throw new WasmBotError(
        "INVALID_CONFIG",
        "Use an HTTP(S) project URL without credentials, query or fragment.",
        0,
      );
    }
    if (
      options.timeoutMs !== undefined &&
      (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 ||
        options.timeoutMs > 2147483647)
    ) {
      throw new WasmBotError(
        "INVALID_CONFIG",
        "timeoutMs must be positive and no greater than 2147483647.",
        0,
      );
    }
    this.options = { ...options };
  }
  async run<T = unknown>(
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<RunResult<T>> {
    let body: string;
    try {
      body = JSON.stringify({ bot: this.options.bot, input });
    } catch {
      throw new WasmBotError(
        "INVALID_INPUT",
        "Input must be JSON serializable.",
        0,
      );
    }
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      this.options.timeoutMs ?? 15000,
    );
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    try {
      if (signal?.aborted) {
        throw new WasmBotError("ABORTED", "Request cancelled.", 0);
      }
      const response = await (this.options.fetch ?? fetch)(
        `${this.options.supabaseUrl.replace(/\/$/, "")}/functions/v1/api-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.options.apiKey}`,
          },
          body,
          signal: controller.signal,
        },
      );
      let result;
      try {
        result = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new WasmBotError(
          "INVALID_RESPONSE",
          "Server returned an unreadable response.",
          response.status,
        );
      }
      if (!response.ok || result?.success !== true) {
        throw new WasmBotError(
          result?.error?.code ?? "HTTP_ERROR",
          result?.error?.message ?? `HTTP ${response.status}`,
          response.status,
          result?.requestId,
        );
      }
      return result as RunResult<T>;
    } catch (error) {
      if (signal?.aborted) {
        throw new WasmBotError("ABORTED", "Request cancelled.", 0);
      }
      if (timedOut) {
        throw new WasmBotError(
          "TIMEOUT",
          "Request timed out. Check execution history before retrying.",
          0,
        );
      }
      if (error instanceof WasmBotError) throw error;
      if (error instanceof TypeError) {
        throw new WasmBotError(
          "NETWORK_ERROR",
          "Unable to reach the bot service.",
          0,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
}
