# Development status — 2026-10-04

## Verified this round

- API transport now bounds network waits to 30 seconds and accepts cancellation.
- Network, malformed server responses, missing Edge Functions and gateway errors have actionable Thai messages. Writes are never automatically retried; timeout advice asks users to check the result before retrying.
- Authentication invalidates pending profile reads on account changes/sign-out and unmount. Late responses cannot restore a previous administrator profile. Failed session reads stop loading.
- Resource reads abort when a page changes/unmounts and clear previous data when disabled.
- TypeScript, frontend/test ESLint, 44 unit/component tests pass. Production frontend build passes (large bundle warnings remain).

- Actual preflight: frontend configuration and WASM header passed; Edge secrets file absent (UNKNOWN, not proof that server secrets are missing).

## Still requires verification / work

- Hosted Supabase end-to-end: register, confirm email, create draft, run, publish, public execution, API keys and admin permission checks. The project and an admin account were configured by the owner, but this round has not verified deployed functions or the full database remotely.
- Verify all seven Edge Functions, WASM artifact packaging, server secrets, RLS and webhook scheduling before declaring deployment ready.
- Deployment preflight added with 6 passing Node tests and included in verify. README/VERIFICATION now distinguish current and historical checks. Hosted verification remains outstanding.
- Audit backend mutation races and validation; run SQL, Edge and WASM checks for backend changes.
- Reduce initial frontend bundle through route-level loading, preserving accessible loading/error states.
- Additional auth tests for rapid switching between two signed-in accounts and token refresh.

## Working copy

Confirmed upload target: `tiansawang1818-pixel/check1`, branch `main`, project subtree `WaSm BOX/`. Upload checkout: `/private/tmp/wasmbox-interface-oct4`. The development folder has a separate local history and its WaSm-BOX remote returned Repository not found; preserve that history and publish through the check1 checkout.

## Hosted deployment — 2026-10-05

- Deployed studio, run-bot, public-bot, api-run, api-keys, admin and webhooks to project reobersqpntqtjpkogdo. CLI reported successful deployment for all seven; WASM assets were uploaded for the three execution functions.
- Confirmed the four custom secrets exist by name (values not retrieved). WEBHOOK_ALLOWED_HOSTS remains unset, so external webhook destinations remain disabled.
- Live unauthenticated smoke checks: studio/run-bot/api-keys/admin/webhooks returned application UNAUTHORIZED (401); api-run returned INVALID_API_KEY (401); public-bot with a nonexistent slug returned BOT_NOT_FOUND (404). This also exercised settings/rate limiting/bot lookup, but does not prove the entire schema or authenticated flows.
- CLI warned Docker was not running but completed deployment through its available upload path, including static WASM. Do not treat the older Docker-only deployment note as current proof of a limitation.
- Remaining: authenticated create/run/publish/Public/API acceptance, actual WASM execution on hosted runtime, ordinary-user admin denial, Cron/webhook delivery and frontend hosting.

## Hosted acceptance — 2026-10-05

Live integration passed all 13 steps against the deployed WASMBOX project: temporary account login, persistent bot creation, cross-owner denial/RLS, draft WASM execution and saved logs, published public runs, immutable V1/V2 snapshots, scoped API execution, embed restrictions, analytics, ordinary-user admin denial, admin disable/block enforcement, API-key revocation and atomic rate limiting.

Mode: LIVE_AUTH_MODE=admin-created. Three temporary accounts were created with Auth Admin and logged in normally. This does not test public signup emails or SMTP. Cleanup soft-deletes test bots, revokes test keys, suspends test profiles and bans the temporary Auth accounts; retained audit/execution records are intentional. Existing user accounts were not modified.

Local validation: 44 Vitest tests, 6 preflight tests and 34 PostgreSQL migration/security checks passed. Hosted webhook delivery, public signup/email confirmation, browser acceptance and frontend hosting remain outstanding.

## Route loading — 2026-10-05 (local, not yet pushed)

Dashboard, bot editor, history, developer/profile and public pages now load on demand with per-route Suspense loading states. Layout remains outside the route loading boundary. Error and not-found pages use Thai text.

Production main JavaScript decreased from 1,041.67 kB (299.64 kB gzip) to 541.08 kB (156.79 kB gzip), about 48% smaller. Dashboard charts and advanced Monaco editor remain separate large payloads loaded when used. This is bundle measurement, not measured browser latency. TypeScript, ESLint, 44 Vitest tests and production build passed. Browser navigation smoke check remains pending for this change.

## Thai account and API UI — 2026-10-07 (local)

Translated profile labels/actions, API key creation/management/revocation prompts, permission explanations, empty state, sign-out, copy and toast-dismiss labels. Technical scope identifiers stay intact. TypeScript, ESLint and 44 tests passed. Real authenticated browser inspection confirmed profile renders and navigation to API keys works, including its empty state and creation form. No key was created and no account data was changed. Screenshot: artifacts/screenshots/api-thai.png (ignored). Other lazy routes and the production build still need browser smoke checks; no claim of full browser acceptance.

## Duplicate submission guard — 2026-10-07 (local)

useAction now locks synchronously before starting an operation, preventing two invocations in the same render cycle from sending duplicate mutations. This applies to the bot builder and other actions using the shared hook. The lock releases after success or failure; non-Error rejections show a Thai fallback message. It does not provide cross-tab or server-side idempotency and does not retry writes automatically.

Regression tests cover same-tick duplicate invocation, busy state, lock release after failure and a subsequent retry. TypeScript, ESLint and all 46 Vitest tests passed. Changes remain local pending the next reviewed upload.

## SDK request failures — 2026-10-07 (local)

SDK now validates URL scheme/credentials and timeout range, reports INVALID_INPUT for nonserializable payloads, skips transport for pre-cancelled requests and normalizes TIMEOUT, ABORTED, NETWORK_ERROR and INVALID_RESPONSE as WasmBotError. Server response error codes remain intact; writes are never retried automatically. SDK declaration build, lint and 52 Vitest tests passed. Changes are not yet pushed.

## Upload batch — 2026-10-07

The route-loading, Thai account/API interface, duplicate-submission guard and SDK error handling described above are included in this upload batch. Their earlier "local" labels record status when first implemented. Final local checks: 52 Vitest tests, 6 preflight tests, frontend/shared/SDK TypeScript, ESLint and production frontend/SDK builds passed. Initial JS is 541.31 kB (156.83 kB gzip). CI confirmation is recorded in the chat after push; email/browser acceptance beyond the checks above, webhook delivery and frontend hosting remain outstanding.
