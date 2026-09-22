import { AppError } from "./policy.ts";
let modulePromise: Promise<WebAssembly.Module> | undefined;
export async function runWasm(rule: unknown, input: unknown, schema: unknown) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ rule, input, schema }),
  );
  if (bytes.length > 131072) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Combined rule and input exceeds 128 KiB.",
    );
  }
  modulePromise ??= Deno.readFile(
    new URL("../wasm-runtime/pkg/wasmbot_engine.wasm", import.meta.url),
  ).then((bytes) => WebAssembly.compile(bytes));
  const module = await modulePromise;
  if (WebAssembly.Module.imports(module).length) {
    throw new AppError(
      "WASM_ERROR",
      "WASM capability imports are forbidden.",
      500,
    );
  }
  const started = performance.now();
  const instance = await WebAssembly.instantiate(module, {});
  const { memory, alloc, evaluate } = instance.exports as unknown as {
    memory: WebAssembly.Memory;
    alloc: (n: number) => number;
    evaluate: (p: number, n: number) => bigint;
  };
  try {
    const p = alloc(bytes.length);
    if (!p) throw new Error("Allocation failed");
    new Uint8Array(memory.buffer, p, bytes.length).set(bytes);
    const packed = evaluate(p, bytes.length);
    const ptr = Number(packed & 0xffffffffn), length = Number(packed >> 32n);
    if (length > 65536) {
      throw new AppError("OUTPUT_TOO_LARGE", "Output exceeds 64 KiB.");
    }
    const result = JSON.parse(
      new TextDecoder().decode(new Uint8Array(memory.buffer, ptr, length)),
    );
    if (!result.success) {
      throw new AppError(
        result.error === "OUTPUT_TOO_LARGE" ? "OUTPUT_TOO_LARGE" : "WASM_ERROR",
        result.error,
      );
    }
    return {
      output: result.output,
      executionTimeMs: Math.ceil(performance.now() - started),
      memoryUsed: memory.buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "WASM_ERROR",
      "WASM trapped or exceeded its memory limit.",
      422,
    );
  }
}
