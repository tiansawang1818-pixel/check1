-- Run after deploying functions and adding the two Vault secrets below.
-- Use the Supabase Dashboard Vault UI to create:
--   wasmbot_project_url = https://YOUR_PROJECT.supabase.co
--   wasmbot_dispatch_secret = same random value as WEBHOOK_SIGNING_SECRET
-- Do not commit real secret values or paste them into source control.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('wasmbot-webhook-outbox', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='wasmbot_project_url') || '/functions/v1/webhooks?action=dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='wasmbot_dispatch_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$job$);
select cron.schedule('wasmbot-maintenance', '*/5 * * * *', 'select public.maintenance()');
