import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectConfig, parseEnv } from './preflight.mjs';
const frontend = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_example123456', VITE_APP_URL: 'http://127.0.0.1:5174' };
const edge = { API_KEY_HASH_SECRET: 'a'.repeat(32), WEBHOOK_SIGNING_SECRET: 'b'.repeat(32), WEBHOOK_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), APP_URL: frontend.VITE_APP_URL };
test('parses quotes, export and comments without evaluating shell code', () => {
  assert.deepEqual(parseEnv('# comment\nexport KEY="a=b"\nOTHER=test # comment\nCMD=$(whoami)'), { KEY: 'a=b', OTHER: 'test', CMD: '$(whoami)' });
});
test('accepts valid public configuration and independent edge secrets', () => {
  assert.ok(inspectConfig(frontend, edge).every(check => check.pass));
});
test('rejects service-role legacy JWT in the public key slot', () => {
  const token = 'header.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.signature';
  assert.equal(inspectConfig({ ...frontend, VITE_SUPABASE_ANON_KEY: token }, edge).find(c => c.name === 'VITE_SUPABASE_ANON_KEY').pass, false);
});
test('rejects exposed secret keys and reports names without values', () => {
  const secret = 'sb_secret_privatevalue';
  const checks = inspectConfig({ ...frontend, VITE_OTHER: secret }, edge);
  assert.ok(checks.some(c => !c.pass));
  assert.ok(!JSON.stringify(checks).includes(secret));
});
test('rejects short secrets, malformed encryption keys and mismatched URLs', () => {
  const checks = inspectConfig(frontend, { ...edge, API_KEY_HASH_SECRET: 'short', WEBHOOK_ENCRYPTION_KEY: 'invalid', APP_URL: 'https://different.example' });
  assert.equal(checks.filter(c => !c.pass).length, 3);
});
test('rejects credential-bearing URLs', () => {
  assert.equal(inspectConfig({ ...frontend, VITE_SUPABASE_URL: 'https://user:pass@example.com' }, edge)[0].pass, false);
});
