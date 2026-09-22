begin;
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, username text not null default '' check(length(username)<=100), email text not null,
 role text not null default 'USER' check(role in ('USER','ADMIN')), status text not null default 'ACTIVE' check(status in ('ACTIVE','SUSPENDED')),
 avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),last_active_at timestamptz
);
create table public.bots (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),name text not null check(length(name) between 2 and 100),description text not null default '',category text not null default 'General',
 input_schema jsonb not null,output_schema jsonb not null,rule_definition jsonb not null,
 status text not null default 'DRAFT' check(status in ('DRAFT','ACTIVE','DISABLED','BLOCKED')),is_published boolean not null default false,public_slug text not null unique,
 allow_public_access boolean not null default false,allow_api_access boolean not null default false,allow_embed boolean not null default false,
 allowed_domains text[] not null default '{}',widget jsonb not null default '{}',rate_limit integer not null default 20 check(rate_limit between 1 and 1000),
 run_count bigint not null default 0,success_count bigint not null default 0,failure_count bigint not null default 0,
 disabled_reason text,disabled_by uuid,disabled_at timestamptz,deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.bot_deployments (
 id uuid primary key default gen_random_uuid(),bot_id uuid not null references public.bots(id),version integer not null check(version>0),rule_snapshot jsonb not null,input_schema_snapshot jsonb not null,output_schema_snapshot jsonb not null,
 deployed_at timestamptz not null default now(),deployed_by uuid not null,active boolean not null default true,unique(bot_id,version)
);
create unique index one_active_deployment on public.bot_deployments(bot_id) where active;
create table public.api_keys (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),name text not null,key_prefix text not null,key_hash text not null unique,
 scopes text[] not null default '{bot:run}' check(scopes <@ array['bot:run','bot:read','execution:read']::text[]),allowed_bot_ids uuid[],last_used_at timestamptz,usage_count bigint not null default 0,revoked_at timestamptz,deleted_at timestamptz,created_at timestamptz not null default now()
);
create table public.executions (
 id uuid primary key default gen_random_uuid(),bot_id uuid not null references public.bots(id),deployment_id uuid references public.bot_deployments(id),user_id uuid,api_key_id uuid references public.api_keys(id),request_id uuid not null unique,
 source text not null check(source in ('DASHBOARD','PUBLIC_PAGE','API','EMBED')),input jsonb not null,output jsonb,status text not null check(status in ('SUCCESS','RUNTIME_ERROR','VALIDATION_ERROR','TIMEOUT','MEMORY_LIMIT','BLOCKED','RATE_LIMITED')),
 execution_time_ms integer not null default 0,memory_used integer,error_message text,created_at timestamptz not null default now()
);
create table public.bot_webhooks (
 id uuid primary key default gen_random_uuid(),bot_id uuid not null unique references public.bots(id),url text not null,secret_encrypted text not null,enabled boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.webhook_deliveries (
 id uuid primary key default gen_random_uuid(),webhook_id uuid not null references public.bot_webhooks(id),execution_id uuid not null references public.executions(id),status text not null default 'PENDING' check(status in ('PENDING','PROCESSING','SUCCESS','FAILED')),status_code integer,attempt_count integer not null default 0,error_message text,next_attempt_at timestamptz not null default now(),locked_at timestamptz,created_at timestamptz not null default now(),unique(webhook_id,execution_id)
);
create table public.bot_reports (
 id uuid primary key default gen_random_uuid(),bot_id uuid not null references public.bots(id),reporter_user_id uuid,reason text not null check(reason in ('Spam','Abusive Content','Suspicious Behavior','Broken Bot','Other')),description text not null default '' check(length(description)<=2000),status text not null default 'PENDING' check(status in ('PENDING','REVIEWED','DISMISSED','ACTION_TAKEN')),created_at timestamptz not null default now()
);
create table public.admin_logs (
 id uuid primary key default gen_random_uuid(),admin_user_id uuid not null,action text not null,target_type text not null,target_id text,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create table public.system_settings (id uuid primary key default gen_random_uuid(),key text not null unique,value jsonb not null,updated_at timestamptz not null default now(),updated_by uuid);
create table public.rate_limit_buckets (key text primary key,window_start timestamptz not null,hits integer not null,expires_at timestamptz not null);
insert into public.system_settings(key,value) values ('max_bots_per_user','20'),('public_rate_limit','20'),('api_rate_limit','30'),('max_api_keys_per_user','10'),('allow_registration','true'),('allow_public_bots','true'),('allow_api_access','true'),('allow_embed','true');
create index on public.bots(user_id,created_at desc);create index on public.bots(status);create index on public.bot_deployments(bot_id);
create index on public.executions(bot_id,created_at desc);create index on public.executions(created_at desc);create index on public.executions(status,created_at desc);create index on public.api_keys(user_id);create index on public.bot_reports(status,created_at desc);create index on public.admin_logs(created_at desc);create index on public.webhook_deliveries(status,next_attempt_at);create index on public.rate_limit_buckets(expires_at);
create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger bots_updated before update on public.bots for each row execute function public.set_updated_at();
create trigger webhook_updated before update on public.bot_webhooks for each row execute function public.set_updated_at();
create function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$begin
 if coalesce((select value::boolean from public.system_settings where key='allow_registration'),true)=false then raise exception 'Registration is disabled';end if;
 insert into public.profiles(id,email,username) values(new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'username',''),100));return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_auth_user_created();
create function public.active_user() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE')$$;
create function public.owns_bot(p_bot uuid) returns boolean language sql stable security definer set search_path='' as $$select public.active_user() and exists(select 1 from public.bots where id=p_bot and user_id=auth.uid() and deleted_at is null)$$;
-- Browser clients cannot mutate protected lifecycle fields; validated writes go through Edge Functions.
alter table public.profiles enable row level security;alter table public.bots enable row level security;alter table public.bot_deployments enable row level security;alter table public.executions enable row level security;alter table public.api_keys enable row level security;alter table public.bot_webhooks enable row level security;alter table public.webhook_deliveries enable row level security;alter table public.bot_reports enable row level security;alter table public.admin_logs enable row level security;alter table public.system_settings enable row level security;alter table public.rate_limit_buckets enable row level security;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.bots,public.bot_deployments,public.executions to authenticated;
grant update(username,avatar_url) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid() and public.active_user()) with check(id=auth.uid());
create policy bot_read on public.bots for select to authenticated using(user_id=auth.uid() and public.active_user() and deleted_at is null);
create policy deployment_read on public.bot_deployments for select to authenticated using(public.owns_bot(bot_id));
create policy execution_read on public.executions for select to authenticated using(public.owns_bot(bot_id));
-- Public callers receive only safe metadata via public-bot; no direct rule/profile/secret disclosure.
create function public.consume_limit(p_key text,p_limit integer,p_seconds integer default 60) returns boolean language plpgsql security definer set search_path='' as $$declare n integer;begin
 insert into public.rate_limit_buckets(key,window_start,hits,expires_at) values(p_key,now(),1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when public.rate_limit_buckets.expires_at<=now() then 1 else public.rate_limit_buckets.hits+1 end,window_start=case when public.rate_limit_buckets.expires_at<=now() then now() else public.rate_limit_buckets.window_start end,expires_at=case when public.rate_limit_buckets.expires_at<=now() then now()+make_interval(secs=>p_seconds) else public.rate_limit_buckets.expires_at end returning hits into n;
 return n<=p_limit;end$$;
create function public.create_bot(p_user uuid,p_bot jsonb,p_slug text) returns public.bots language plpgsql security definer set search_path='' as $$declare b public.bots;lim integer;begin
 perform 1 from public.profiles where id=p_user and status='ACTIVE' for update;if not found then raise exception 'FORBIDDEN';end if;
 select value::integer into lim from public.system_settings where key='max_bots_per_user';if (select count(*) from public.bots where user_id=p_user and deleted_at is null)>=lim then raise exception 'BOT_LIMIT';end if;
 insert into public.bots(user_id,name,description,category,input_schema,output_schema,rule_definition,public_slug,allow_public_access,allow_api_access,allow_embed,allowed_domains,widget,rate_limit) values(p_user,p_bot->>'name',p_bot->>'description',p_bot->>'category',p_bot->'input_schema',p_bot->'output_schema',p_bot->'rule_definition',p_slug,(p_bot->>'allow_public_access')::boolean,(p_bot->>'allow_api_access')::boolean,(p_bot->>'allow_embed')::boolean,array(select jsonb_array_elements_text(p_bot->'allowed_domains')),p_bot->'widget',(p_bot->>'rate_limit')::integer) returning * into b;return b;end$$;
create function public.publish_bot(p_bot uuid,p_user uuid) returns public.bot_deployments language plpgsql security definer set search_path='' as $$declare b public.bots;d public.bot_deployments;v integer;begin
 select * into b from public.bots where id=p_bot and user_id=p_user and deleted_at is null for update;if not found then raise exception 'FORBIDDEN';end if;
 if b.status in ('DISABLED','BLOCKED') then raise exception 'BOT_DISABLED';end if;
 if not exists(select 1 from public.profiles where id=p_user and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 select coalesce(max(version),0)+1 into v from public.bot_deployments where bot_id=p_bot;
 update public.bot_deployments set active=false where bot_id=p_bot and active;
 insert into public.bot_deployments(bot_id,version,rule_snapshot,input_schema_snapshot,output_schema_snapshot,deployed_by) values(p_bot,v,b.rule_definition,b.input_schema,b.output_schema,p_user) returning * into d;
 update public.bots set is_published=true,status='ACTIVE' where id=p_bot;return d;end$$;
create function public.create_api_key(p_user uuid,p_key jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;lim integer;begin
 perform 1 from public.profiles where id=p_user and status='ACTIVE' for update;if not found then raise exception 'FORBIDDEN';end if;
 select value::integer into lim from public.system_settings where key='max_api_keys_per_user';if (select count(*) from public.api_keys where user_id=p_user and revoked_at is null and deleted_at is null)>=lim then raise exception 'KEY_LIMIT';end if;
 insert into public.api_keys(user_id,name,key_prefix,key_hash,scopes,allowed_bot_ids) values(p_user,p_key->>'name',p_key->>'key_prefix',p_key->>'key_hash',array(select jsonb_array_elements_text(p_key->'scopes')),case when p_key->'allowed_bot_ids'='null'::jsonb then null else array(select jsonb_array_elements_text(p_key->'allowed_bot_ids')::uuid) end) returning id into result;return result;end$$;
create function public.record_execution(p_execution jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare e public.executions;b public.bots;begin
 select * into b from public.bots where id=(p_execution->>'bot_id')::uuid for update;
 if p_execution->>'status'='SUCCESS' and (b.status in ('DISABLED','BLOCKED') or b.deleted_at is not null or not exists(select 1 from public.profiles where id=b.user_id and status='ACTIVE') or (p_execution->>'source'<>'DASHBOARD' and not b.is_published)) then raise exception 'BOT_DISABLED';end if;
 if p_execution->>'status'='SUCCESS' and p_execution->>'source'='API' and (not b.allow_api_access or not exists(select 1 from public.api_keys where id=(p_execution->>'api_key_id')::uuid and revoked_at is null and deleted_at is null)) then raise exception 'API_KEY_REVOKED';end if;
 if p_execution->>'status'='SUCCESS' and ((p_execution->>'source'='PUBLIC_PAGE' and not b.allow_public_access) or (p_execution->>'source'='EMBED' and not b.allow_embed)) then raise exception 'BOT_DISABLED';end if;
 insert into public.executions(bot_id,deployment_id,user_id,api_key_id,request_id,source,input,output,status,execution_time_ms,memory_used,error_message) values((p_execution->>'bot_id')::uuid,(p_execution->>'deployment_id')::uuid,(p_execution->>'user_id')::uuid,(p_execution->>'api_key_id')::uuid,(p_execution->>'request_id')::uuid,p_execution->>'source',p_execution->'input',p_execution->'output',p_execution->>'status',(p_execution->>'execution_time_ms')::integer,(p_execution->>'memory_used')::integer,p_execution->>'error_message') returning * into e;
 update public.bots set run_count=run_count+1,success_count=success_count+case when e.status='SUCCESS' then 1 else 0 end,failure_count=failure_count+case when e.status<>'SUCCESS' then 1 else 0 end where id=e.bot_id;
 if e.api_key_id is not null then update public.api_keys set last_used_at=now(),usage_count=usage_count+1 where id=e.api_key_id;end if;
 if e.status='SUCCESS' and e.source<>'DASHBOARD' then insert into public.webhook_deliveries(webhook_id,execution_id) select id,e.id from public.bot_webhooks where bot_id=e.bot_id and enabled;end if;
 return e.id;end$$;
create function public.claim_deliveries(p_bot uuid default null) returns setof public.webhook_deliveries language sql security definer set search_path='' as $$
 update public.webhook_deliveries set status='PROCESSING',locked_at=now(),attempt_count=attempt_count+1 where id in (
 select d.id from public.webhook_deliveries d join public.bot_webhooks w on w.id=d.webhook_id where w.enabled and (p_bot is null or w.bot_id=p_bot) and d.attempt_count<3 and ((d.status='PENDING' and d.next_attempt_at<=now()) or (d.status='PROCESSING' and d.locked_at<now()-interval '1 minute')) order by d.created_at for update of d skip locked limit 10) returning *$$;
create function public.bot_analytics(p_user uuid,p_bot uuid default null,p_admin boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if p_admin and not exists(select 1 from public.profiles where id=p_user and role='ADMIN' and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 with visible as (select e.* from public.executions e join public.bots b on b.id=e.bot_id where (p_admin or b.user_id=p_user) and (p_bot is null or b.id=p_bot)),totals as (select count(*) total,count(*) filter(where status='SUCCESS') success,count(*) filter(where status<>'SUCCESS') failed,coalesce(avg(execution_time_ms),0) average_ms,count(*) filter(where created_at>=date_trunc('day',now())) today,count(*) filter(where created_at>=now()-interval '7 days') week,count(*) filter(where created_at>=now()-interval '30 days') as "month",count(*) filter(where source='API') api,count(*) filter(where source='API' and created_at>=date_trunc('day',now())) api_today,count(*) filter(where source='PUBLIC_PAGE') public,count(*) filter(where source='EMBED') embed from visible),days as(select d::date as "day" from generate_series(current_date-29,current_date,'1 day') d),daily as(select days.day,count(v.id) runs,count(v.id) filter(where v.status<>'SUCCESS') failures from days left join visible v on v.created_at::date=days.day group by days.day order by days.day),errors as(select error_message,count(*) count from visible where status<>'SUCCESS' group by error_message order by count(*) desc limit 5)
 select jsonb_build_object('botCounts',(select jsonb_build_object('total',count(*),'published',count(*) filter(where is_published)) from public.bots where (p_admin or user_id=p_user) and deleted_at is null),'totals',(select to_jsonb(t) from totals t),'daily',(select coalesce(jsonb_agg(d),'[]') from daily d),'errors',(select coalesce(jsonb_agg(e),'[]') from errors e)) into result;return result;end$$;
create function public.admin_mutation(p_admin uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$declare target text;begin
 perform pg_advisory_xact_lock(904021);
 if not exists(select 1 from public.profiles where id=p_admin and role='ADMIN' and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 if p_action in ('user-status','user-role','user-delete') then
 target='profiles';if p_id=p_admin then raise exception 'Cannot modify own administrative access';end if;
 if not exists(select 1 from public.profiles where id=p_id) then raise exception 'NOT_FOUND';end if;
 if p_action='user-status' then update public.profiles set status=p_data->>'status' where id=p_id;
 elsif p_action='user-role' then update public.profiles set role=p_data->>'role' where id=p_id;
 else update public.profiles set status='SUSPENDED',username='Deleted user',avatar_url=null where id=p_id;update public.bots set deleted_at=now(),is_published=false where user_id=p_id;update public.api_keys set revoked_at=now() where user_id=p_id;end if;
 elsif p_action in ('bot-status','bot-unpublish','bot-delete') then
 target='bots';if not exists(select 1 from public.bots where id=p_id) then raise exception 'NOT_FOUND';end if;
 if p_action='bot-status' then
 if p_data->>'status' in ('DISABLED','BLOCKED') and length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required';end if;
 update public.bots set status=p_data->>'status',disabled_reason=case when p_data->>'status'='ACTIVE' then null else p_data->>'reason' end,disabled_by=case when p_data->>'status'='ACTIVE' then null else p_admin end,disabled_at=case when p_data->>'status'='ACTIVE' then null else now() end where id=p_id;
 elsif p_action='bot-unpublish' then update public.bots set is_published=false where id=p_id;update public.bot_deployments set active=false where bot_id=p_id;
 else update public.bots set deleted_at=now(),is_published=false where id=p_id;end if;
 elsif p_action='report' then target='bot_reports';update public.bot_reports set status=p_data->>'status' where id=p_id;
 elsif p_action='settings' then target='system_settings';update public.system_settings s set value=j.value,updated_at=now(),updated_by=p_admin from jsonb_each(p_data) j where s.key=j.key;
 else raise exception 'Unknown action';end if;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,details) values(p_admin,p_action,target,p_id::text,p_data);end$$;
create function public.owner_mutation(p_user uuid,p_bot uuid,p_action text,p_status text default null) returns void language plpgsql security definer set search_path='' as $$declare b public.bots;begin
 if not exists(select 1 from public.profiles where id=p_user and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 select * into b from public.bots where id=p_bot and user_id=p_user and deleted_at is null for update;if not found then raise exception 'FORBIDDEN';end if;
 if p_action='delete' then update public.bots set deleted_at=now(),is_published=false where id=p_bot;update public.bot_deployments set active=false where bot_id=p_bot;
 elsif p_action='unpublish' then update public.bots set is_published=false where id=p_bot;update public.bot_deployments set active=false where bot_id=p_bot;
 elsif p_action='status' then
 if b.status='BLOCKED' or b.disabled_by is not null or p_status not in ('ACTIVE','DISABLED') then raise exception 'FORBIDDEN';end if;
 update public.bots set status=p_status where id=p_bot;
 else raise exception 'FORBIDDEN';end if;end$$;
create function public.admin_overview(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles where id=p_user and role='ADMIN' and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 return jsonb_build_object('stats',jsonb_build_object('users',(select count(*) from public.profiles),'active',(select count(*) from public.profiles where status='ACTIVE'),'suspended',(select count(*) from public.profiles where status='SUSPENDED'),'bots',(select count(*) from public.bots where deleted_at is null),'published',(select count(*) from public.bots where is_published and deleted_at is null),'disabled',(select count(*) from public.bots where status='DISABLED' and deleted_at is null),'blocked',(select count(*) from public.bots where status='BLOCKED' and deleted_at is null),'reports',(select count(*) from public.bot_reports where status='PENDING')),'analytics',public.bot_analytics(p_user,null,true),'newUsers',(select coalesce(jsonb_agg(t),'[]') from (select created_at::date as day,count(*) as runs from public.profiles where created_at>=current_date-6 group by created_at::date order by created_at::date)t),'newBots',(select coalesce(jsonb_agg(t),'[]') from (select created_at::date as day,count(*) as runs from public.bots where created_at>=current_date-6 group by created_at::date order by created_at::date)t));end$$;
create function public.maintenance() returns void language plpgsql security definer set search_path='' as $$begin
 delete from public.rate_limit_buckets where expires_at<now()-interval '1 day';
 update public.webhook_deliveries set status='FAILED',error_message='Worker interrupted on final delivery attempt' where status='PROCESSING' and attempt_count>=3 and locked_at<now()-interval '1 minute';
end$$;

create function public.record_key_use(p_key uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.api_keys set last_used_at=now(),usage_count=usage_count+1 where id=p_key and revoked_at is null and deleted_at is null;if not found then raise exception 'API_KEY_REVOKED';end if;end$$;
create function public.admin_users(p_user uuid,p_offset integer default 0) returns table(id uuid,username text,email text,role text,status text,created_at timestamptz,last_active_at timestamptz,bot_count bigint,run_count numeric) language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles p where p.id=p_user and p.role='ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 return query select p.id,p.username,p.email,p.role,p.status,p.created_at,p.last_active_at,b.bot_count,b.run_count from public.profiles p cross join lateral (select count(*) filter(where bots.deleted_at is null) bot_count,coalesce(sum(bots.run_count),0) run_count from public.bots bots where bots.user_id=p.id) b order by p.created_at desc limit 50 offset greatest(0,least(p_offset,500000));end$$;

-- Functions taking user IDs are server-only; never grant them to browser roles.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.active_user(),public.owns_bot(uuid) to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
commit;
