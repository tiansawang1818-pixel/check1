# Nested condition groups

Each rule retains `conditions`, `match`, and `output`. Optional `groups` contains groups with `conditions`, `match`, and optional child `groups`. The parent AND/OR combines every direct condition and child result. Empty condition arrays are allowed only when the group has children. Rules still return the first matching output. Legacy version 1 flat rules remain supported.

Limits: 20 direct conditions and 20 child groups per group; 4 nested levels below the root; 100 total leaf conditions per rule; 100 rules. Both schema and Rust validate all branches before evaluation, including unreachable branches. Field deletion checks descend into groups.

Example: `(score >= 80 AND score <= 90) OR score == 42`:

```json
{
  "version": 1,
  "rules": [{
    "match": "OR", "conditions": [],
    "groups": [
      {"match":"AND","conditions":[{"field":"score","operator":">=","value":80},{"field":"score","operator":"<=","value":90}]},
      {"match":"AND","conditions":[{"field":"score","operator":"==","value":42}]}
    ],
    "output": "match"
  }],
  "defaultOutput": "no match"
}
```

## Rollout

2026-10-18: rebuilt WASM and shared schema deployed to Supabase project reobersqpntqtjpkogdo. All seven functions (studio, run-bot, public-bot, api-run, api-keys, admin, webhooks) are ACTIVE at version 2. Public bot execution returned HTTP 200 (score 85 → A); protected endpoints returned HTTP 401 without credentials. Nested-rule truth tables passed locally against the uploaded WASM; a hosted nested-rule bot was not created as part of this deployment. No SQL migration is required for the existing JSON rule storage. Deploy backend before releasing the frontend. Do not roll back to an older engine while nested definitions are in use.

Verification: 62 Vitest tests, 4 Rust unit tests, existing 30 WASM checks plus nested truth table/empty group/depth checks, 6 Deno runtime tests, TypeScript and frontend build.
