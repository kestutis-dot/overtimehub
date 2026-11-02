alter table public.companies add column if not exists min_hours_for_food numeric not null default 2;

create or replace function public.public_get_request(p_token text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'session', json_build_object('id',s.id,'date',s.date,'title',s.title,'estimated_hours',s.estimated_hours,'includes_food',s.includes_food,'is_open',s.is_open),
    'company_name', c.name,
    'min_hours_for_food', c.min_hours_for_food,
    'menu', coalesce((select json_agg(json_build_object('id',m.id,'name',m.name,'category',m.category) order by m.category, m.name) from food_menus m where m.company_id = s.company_id and m.is_visible), '[]'::json))
  from overtime_sessions s join companies c on c.id = s.company_id where s.share_token = p_token $$;

create or replace function public.public_submit_answer(p_token text, p_name text, p_response_type text, p_hours numeric, p_food_id text, p_food_comment text) returns json language plpgsql security definer set search_path = public as $$
declare s overtime_sessions; n text := btrim(coalesce(p_name,'')); h numeric; fname text; fid text; cmt text := nullif(left(btrim(coalesce(p_food_comment,'')),200),''); r overtime_entries; th numeric;
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
  select min_hours_for_food into th from companies where id = s.company_id;
  if p_response_type <> 'declined' and s.includes_food and h > coalesce(th,0) then
    select id, name into fid, fname from food_menus where id = p_food_id and company_id = s.company_id and is_visible;
    if fid is null then raise exception 'Choose a dish'; end if;
  else cmt := null; end if;
  insert into overtime_entries(company_id, session_id, user_name, response_type, can_work, hours, is_until_finished, food_id, food_name, food_comment)
  values (s.company_id, s.id, n, p_response_type, p_response_type <> 'declined', h, p_response_type='full', fid, fname, cmt)
  on conflict (session_id, lower(user_name)) do update set response_type = excluded.response_type, can_work = excluded.can_work, hours = excluded.hours, is_until_finished = excluded.is_until_finished, food_id = excluded.food_id, food_name = excluded.food_name, food_comment = excluded.food_comment, user_name = excluded.user_name
  returning * into r;
  return json_build_object('id',r.id,'user_name',r.user_name,'response_type',r.response_type,'hours',r.hours,'food_name',r.food_name);
end $$;