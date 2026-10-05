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
