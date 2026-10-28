# Edge deployment — 2026-10-18

Project: WASMBOX (`reobersqpntqtjpkogdo`).

Deployed all seven existing functions via Supabase API bundling. All are ACTIVE, version 2. Included rebuilt `wasmbot_engine.wasm` for run-bot, public-bot and api-run. Existing JWT gateway settings retained; handlers enforce authentication and ownership. No database migration, secrets change or frontend deployment performed.

Validation:
- Deno type checks: all seven entrypoints passed.
- Deno runtime tests: 6 passed.
- WASM: 30 checks plus nested AND/OR truth table, invalid empty branch and depth limit passed.
- Live public bot metadata: HTTP 200.
- Live test bot execution: score 85 returned A, HTTP 200, execution ID 9b7c0f00-7eeb-4547-bf77-f9256533b0e0. This creates one normal execution log.
- studio, run-bot, api-keys, admin and webhooks without session: HTTP 401.
- api-run without API key: HTTP 401.

Limitations: live nested-rule creation/publish, authenticated API-key execution and webhook delivery were not exercised. Frontend hosting and production origin configuration remain separate work. Do not roll back to the old engine after storing nested definitions.
