# @wasmbot/sdk

A small typed client for the WasmBot Studio Supabase `api-run` function. Requires a fetch-capable runtime (Node 18+ or modern browser), but secret API keys should only be used in trusted server environments. Use the public widget for websites that cannot protect a secret.

Build from repository root:

```sh
pnpm build:sdk
```

Install the local `sdk/` directory into a consumer with `pnpm add /absolute/path/to/sdk`. To distribute a package, run `pnpm pack` inside this directory; it is not automatically published to npm.

```ts
import { WasmBot, WasmBotError } from '@wasmbot/sdk';

const client = new WasmBot({
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  bot: 'grade-calculator-YOUR_SLUG',
  apiKey: process.env.WASMBOT_API_KEY!,
  timeoutMs: 15_000,
});

try {
  const result = await client.run<string>({ score: 85 });
  console.log(result.data); // A for the published grade rules
  console.log(result.execution.requestId);
} catch (error) {
  if (error instanceof WasmBotError) {
    console.error(error.code, error.status, error.requestId);
  } else {
    throw error; // network error or abort
  }
}
```

Optional second argument to `run` is an `AbortSignal`. Configure a custom Fetch implementation with the constructor's `fetch` option. Requests are not automatically retried because successful executions can trigger webhooks. Handle HTTP 429 with a caller-controlled retry policy.

The key requires `bot:run`, must belong to the bot owner, and must include the bot in its allowlist if scoped to selected bots. Published/active/API-enabled and owner-active checks always run on the server.
