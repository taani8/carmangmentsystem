-- Add user_id to drivers and tighten RLS for driver self-access
alter table public.drivers add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- Policy helpers
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

alter table public.drivers enable row level security;
alter table public.trips enable row level security;

-- Admin full access
drop policy if exists drivers_all_admins on public.drivers;
create policy drivers_all_admins on public.drivers
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists trips_all_admins on public.trips;
create policy trips_all_admins on public.trips
for all using (public.is_admin()) with check (public.is_admin());

-- Drivers can see/update only their own record
drop policy if exists drivers_self_select on public.drivers;
create policy drivers_self_select on public.drivers
for select using (user_id = auth.uid());

drop policy if exists drivers_self_update on public.drivers;
create policy drivers_self_update on public.drivers
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Drivers can read their own trips
drop policy if exists trips_self_select on public.trips;
create policy trips_self_select on public.trips
for select using (
  exists (
    select 1 from public.drivers d where d.id = trips.driver_id and d.user_id = auth.uid()
  )
);

-- Optional: allow anon to call summary RPC; restrict table access to admins/drivers
-- Bind current authenticated user to a driver by phone once after login (idempotent)
create or replace function public.bind_current_user_to_driver(p_phone text)
returns void language plpgsql security definer as $$
declare
  v_phone text;
  v_user uuid := auth.uid();
  v_driver_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  v_phone := regexp_replace(coalesce(p_phone,''), '\\D', '', 'g');
  if length(v_phone) = 9 then v_phone := '0' || v_phone; end if;

  select id into v_driver_id from public.drivers where lower(phone) = lower(v_phone) limit 1;
  if v_driver_id is null then
    raise exception 'Driver not found for phone %', p_phone;
  end if;

  -- Set user_id only if not already set
  update public.drivers set user_id = v_user where id = v_driver_id and user_id is null;
end$$;

revoke all on function public.bind_current_user_to_driver(text) from public;
grant execute on function public.bind_current_user_to_driver(text) to authenticated;

