# Hosted acceptance — 5 October 2026

Live Supabase integration: **1 suite, 13 steps passed**, using actual deployed Edge Functions, Postgres, Auth login and Rust WASM. Covers creation, execution/logs, publishing/version snapshots, public/API/embed, ownership/RLS, admin permissions/lifecycle, revocation and rate limiting. Temporary users were admin-created and confirmed automatically, so **public signup and email delivery remain unverified**. Cleanup disables temporary test resources while retaining audit/history.

Local checks this round: **44 Vitest**, **6 Node preflight**, **34 SQL security** checks passed; TypeScript, frontend/test ESLint and production frontend build passed. See DEVELOPMENT_STATUS.md for details.

# Current verification — 4 October 2026

- Frontend/shared TypeScript and frontend/test ESLint passed.
- Vitest: **44 passed**, including API timeout/cancellation/error handling, profile responses arriving after sign-out, and stale resource reads.
- Deployment preflight: **6 Node tests passed**. Actual local configuration: frontend URL/key/app URL and WASM header passed; `.env.edge` absent, so server secrets remain **UNKNOWN**. No secrets were printed.
- Frontend production build passed; large bundle warnings remain.
- These checks did not rerun the entire Rust/Deno/SQL pipeline, deploy anything, or verify hosted end-to-end behavior.

The historical report below records the checks at that earlier date, not current hosted state. See DEVELOPMENT_STATUS.md for ongoing work.

---

# Verification results — 22 September 2026

The complete `pnpm verify` pipeline passes in this workspace. This report distinguishes local checks from deployment acceptance; **it is not a claim that a Supabase-hosted production deployment has been tested**.

| Check | Result | Evidence / coverage |
|---|---|---|
| Dependency installation | PASS | pnpm lockfile; Rust Cargo.lock; Deno lockfile |
| Frontend + shared schema TypeScript | PASS | `pnpm typecheck` |
| SDK TypeScript + declarations | PASS | `sdk/dist/index.js`, `sdk/dist/index.d.ts` |
| ESLint + Deno lint | PASS | `pnpm lint` |
| Vitest | 23 PASS | 18 schema/permission checks, 3 React component checks, 2 SDK checks |
| SQL migration and security | 34 PASS | Real migration applied to PGlite PostgreSQL; RLS, column grants, forbidden service RPCs, registration trigger, ownership, version snapshots, lifecycle, admin auditing, key limits/use, counters, analytics, webhook outbox/leases/retry cap |
| Rust native unit tests | 4 PASS | Grade output, invalid input, invalid JSON, payload bounds |
| Rust → WASM production build | PASS | Release `wasm32-unknown-unknown`, linker-enforced 32 MiB maximum |
| Actual WASM binary | 30 checks PASS | 12 operators, numeric type separation, AND/OR, grade scenarios, malformed requests, output limits, zero imports, growth to 32 MiB allowed and beyond rejected |
| Deno runtime tests | 6 PASS | Actual Rust WASM execution, HMAC known answer, AES-GCM nonce/tamper checks, webhook destination restrictions, streaming body limit, JSON complexity bound |
| All 7 Edge Functions | PASS | Deno typecheck with the same explicit import map configured for deployment |
| Frontend production build | PASS | `dist/` generated with locally bundled Monaco JSON editor/workers |
| SDK production build | PASS | ESM JavaScript + `.d.ts` generated |
| Browser smoke test | PASS, limited scope | Real Vite setup page renders at desktop and 390px mobile width; no browser console errors. Authenticated screens could not be browser-tested without a Supabase project |
| Real Supabase acceptance suite | 1 IGNORED | No project or credentials provided; test has an explicit environment gate |
| Hosted migration / Edge deploy / SMTP | NOT RUN | Requires the user's new Supabase project, CLI login and deployment environment |
| Supabase CLI `db lint` | NOT RUN | No local Docker Supabase stack; actual SQL execution was verified with PGlite instead |
| Actual outgoing webhook delivery | NOT RUN | No authorized hosted project/receiver. Crypto, destination policy and DB outbox were tested locally |

## Built WASM artifact

File: `supabase/functions/wasm-runtime/pkg/wasmbot_engine.wasm` (about 152 KiB).

SHA-256:

```text
d88100b32c4f8edd43b3759dba74264e3d49b0a03196ee1bd169a8c155b3fec5
```

The generated binary is ignored by Git. Rebuild before deployment; the source and Cargo.lock are included. Runtime imports are checked using `WebAssembly.Module.imports()` and must be empty. No JavaScript implementation substitutes for rule evaluation.

## Warnings and limits

- Vite reports chunks larger than 500 kB, principally the advanced Monaco editor (lazy loaded) and application/chart bundle. These are warnings, not build failures.
- The pinned Edge Supabase client emits a `punycode` deprecation warning through Deno's Node compatibility layer during local tests; tests pass.
- PGlite is a real PostgreSQL engine, but its supplied Auth schema/role harness does not test Supabase Auth, JWT gateway behavior, or hosted runtime packaging.
- A hard Supabase worker CPU termination cannot reliably be recorded as an execution timeout. The app uses bounded rules plus a real WASM memory cap, not a fake Promise-based synchronous-WASM timeout.
- Domain allowlisting is a browser embedding policy, not authentication for clients capable of forging HTTP headers.
- Production launch still requires running the opt-in live suite, real browser journeys and the deployment/SMTP/webhook checks documented in README.

## Reproduce

```sh
pnpm install --frozen-lockfile
rustup target add wasm32-unknown-unknown
pnpm verify
cargo test --locked --manifest-path supabase/functions/wasm-runtime/Cargo.toml
```

See [README.md](README.md) for Supabase setup and live acceptance commands.
