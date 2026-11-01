create table public.companies (id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 100), created_at timestamptz not null default now());
create table public.memberships (user_id uuid not null, company_id uuid not null references public.companies(id) on delete cascade, role text not null default 'manager', created_at timestamptz not null default now(), primary key (user_id, company_id));
create table public.food_menus (id text primary key default gen_random_uuid()::text, company_id uuid not null references public.companies(id) on delete cascade, name text not null check (char_length(name) between 1 and 80), category text not null default 'Pizza', is_visible boolean not null default true, created_at timestamptz not null default now(), unique (company_id, name));
create table public.overtime_sessions (id text primary key default gen_random_uuid()::text, company_id uuid not null references public.companies(id) on delete cascade, date date not null default current_date, title text not null default 'Overtid', estimated_hours numeric(4,2) not null default 2 check (estimated_hours > 0 and estimated_hours <= 24), includes_food boolean not null default true, is_open boolean not null default true, share_token text not null unique default encode(extensions.gen_random_bytes(18),'hex'), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.overtime_entries (id text primary key default gen_random_uuid()::text, company_id uuid not null references public.companies(id) on delete cascade, session_id text not null references public.overtime_sessions(id) on delete cascade, user_name text not null, response_type text not null check (response_type in ('full','partial','declined')), can_work boolean not null default true, hours numeric(4,2), is_until_finished boolean not null default false, food_id text, food_name text, food_comment text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index overtime_entries_name_uq on public.overtime_entries (session_id, lower(user_name));

grant select, insert, update, delete on public.companies, public.memberships, public.food_menus, public.overtime_sessions, public.overtime_entries to authenticated;
grant all on public.companies, public.memberships, public.food_menus, public.overtime_sessions, public.overtime_entries to service_role;

alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.food_menus enable row level security;
alter table public.overtime_sessions enable row level security;
alter table public.overtime_entries enable row level security;

create or replace function public.is_member(_company uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where user_id = auth.uid() and company_id = _company) $$;

create policy "members read company" on public.companies for select to authenticated using (public.is_member(id));
create policy "members update company" on public.companies for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy "own memberships" on public.memberships for select to authenticated using (user_id = auth.uid());
create policy "menu members" on public.food_menus for all to authenticated using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy "sessions members" on public.overtime_sessions for all to authenticated using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy "entries members" on public.overtime_entries for all to authenticated using (public.is_member(company_id)) with check (public.is_member(company_id));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger t_sessions_upd before update on public.overtime_sessions for each row execute function public.touch_updated_at();
create trigger t_entries_upd before update on public.overtime_entries for each row execute function public.touch_updated_at();

create or replace function public.create_company(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; n text := btrim(coalesce(p_name,''));
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if char_length(n) < 1 or char_length(n) > 100 then raise exception 'Invalid name'; end if;
  insert into companies(name) values (n) returning id into cid;
  insert into memberships(user_id, company_id, role) values (auth.uid(), cid, 'manager');
  insert into food_menus(company_id, name, category) values (cid,'Pepperoni','Pizza'),(cid,'Margherita','Pizza'),(cid,'Kebab','Pizza'),(cid,'Vegetar','Pizza');
  return cid;
end $$;

create or replace function public.rotate_share_token(p_session_id text) returns text language plpgsql security definer set search_path = public as $$
declare t text := encode(extensions.gen_random_bytes(18),'hex'); cid uuid;
begin
  select company_id into cid from overtime_sessions where id = p_session_id;
  if cid is null or not is_member(cid) then raise exception 'Not allowed'; end if;
  update overtime_sessions set share_token = t where id = p_session_id;
  return t;
end $$;

create or replace function public.public_get_request(p_token text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'session', json_build_object('id',s.id,'date',s.date,'title',s.title,'estimated_hours',s.estimated_hours,'includes_food',s.includes_food,'is_open',s.is_open),
    'company_name', c.name,
    'menu', coalesce((select json_agg(json_build_object('id',m.id,'name',m.name,'category',m.category) order by m.category, m.name) from food_menus m where m.company_id = s.company_id and m.is_visible), '[]'::json))
  from overtime_sessions s join companies c on c.id = s.company_id where s.share_token = p_token $$;

create or replace function public.public_get_my_answer(p_token text, p_name text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id',e.id,'user_name',e.user_name,'response_type',e.response_type,'can_work',e.can_work,'hours',e.hours,'food_id',e.food_id,'food_name',e.food_name,'food_comment',e.food_comment)
  from overtime_entries e join overtime_sessions s on s.id = e.session_id
  where s.share_token = p_token and lower(e.user_name) = lower(btrim(p_name)) limit 1 $$;

create or replace function public.public_submit_answer(p_token text, p_name text, p_response_type text, p_hours numeric, p_food_id text, p_food_comment text) returns json language plpgsql security definer set search_path = public as $$
declare s overtime_sessions; n text := btrim(coalesce(p_name,'')); h numeric; fname text; fid text; cmt text := nullif(left(btrim(coalesce(p_food_comment,'')),200),''); r overtime_entries;
begin
  select * into s from overtime_sessions where share_token = p_token;
  if s.id is null then raise exception 'Invalid link'; end if;
  if not s.is_open then raise exception 'Request is closed'; end if;
  if char_length(n) < 1 or char_length(n) > 60 then raise exception 'Invalid name'; end if;
  if p_response_type not in ('full','partial','declined') then raise exception 'Invalid response'; end if;
  if p_response_type = 'full' then h := s.estimated_hours;
  elsif p_response_type = 'partial' then
    if p_hours is null or p_hours <= 0 or p_hours > s.estimated_hours then raise exception 'Invalid hours'; end if; h := p_hours;
  else h := 0; end if;
  if p_response_type <> 'declined' and s.includes_food then
    select id, name into fid, fname from food_menus where id = p_food_id and company_id = s.company_id and is_visible;
    if fid is null then raise exception 'Choose a dish'; end if;
  else cmt := null; end if;
  insert into overtime_entries(company_id, session_id, user_name, response_type, can_work, hours, is_until_finished, food_id, food_name, food_comment)
  values (s.company_id, s.id, n, p_response_type, p_response_type <> 'declined', h, p_response_type='full', fid, fname, cmt)
  on conflict (session_id, lower(user_name)) do update set response_type = excluded.response_type, can_work = excluded.can_work, hours = excluded.hours, is_until_finished = excluded.is_until_finished, food_id = excluded.food_id, food_name = excluded.food_name, food_comment = excluded.food_comment, user_name = excluded.user_name
  returning * into r;
  return json_build_object('id',r.id,'user_name',r.user_name,'response_type',r.response_type,'hours',r.hours,'food_name',r.food_name);
end $$;

revoke all on function public.create_company(text), public.rotate_share_token(text), public.public_get_request(text), public.public_get_my_answer(text,text), public.public_submit_answer(text,text,text,numeric,text,text), public.is_member(uuid) from public;
grant execute on function public.create_company(text), public.rotate_share_token(text), public.is_member(uuid) to authenticated;
grant execute on function public.public_get_request(text), public.public_get_my_answer(text,text), public.public_submit_answer(text,text,text,numeric,text,text) to anon, authenticated;

alter publication supabase_realtime add table public.overtime_entries, public.overtime_sessions;