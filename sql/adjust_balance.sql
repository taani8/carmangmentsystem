-- Safe balance adjustment RPC to avoid race conditions
create or replace function public.adjust_driver_balance(p_driver_id uuid, p_amount numeric)
returns void language plpgsql security definer as $$
begin
  update public.drivers
  set balance = coalesce(balance,0) + coalesce(p_amount,0)
  where id = p_driver_id;
end$$;

revoke all on function public.adjust_driver_balance(uuid, numeric) from public;
grant execute on function public.adjust_driver_balance(uuid, numeric) to authenticated;

