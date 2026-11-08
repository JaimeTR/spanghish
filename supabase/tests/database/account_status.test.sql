-- Pruebas pgTAP de account_status() (migración 0005_account_status.sql).
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'as-active@test.local', '{}', '{}', now(), now()),
  ('82222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'as-suspended@test.local', '{}', '{}', now(), now());
update public.profiles set status = 'suspended' where id = '82222222-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claims = '{"sub":"81111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(public.account_status(), 'active', 'account_status is active for an active user');

set local request.jwt.claims = '{"sub":"82222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(public.account_status(), 'suspended', 'account_status is suspended for a suspended user');

set local request.jwt.claims = '{"sub":"89999999-9999-9999-9999-999999999999","role":"authenticated"}';
select is(public.account_status(), null, 'account_status is null for a user without profile');

reset role;
set local role anon;
select throws_ok($$ select public.account_status() $$, '42501', null, 'anon cannot call account_status');
reset role;
set local role service_role;
select throws_ok($$ select public.account_status() $$, '42501', null, 'service_role cannot call account_status');

reset role;
select * from finish();
rollback;
