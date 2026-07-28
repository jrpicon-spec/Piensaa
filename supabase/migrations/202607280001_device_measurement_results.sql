begin;

alter table public.mediciones
  add column if not exists nivel smallint,
  add column if not exists exitoso boolean,
  add column if not exists boton_correcto smallint,
  add column if not exists boton_presionado smallint,
  add column if not exists timeout boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mediciones_nivel_check'
  ) then
    alter table public.mediciones
      add constraint mediciones_nivel_check
      check (nivel between 1 and 4) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mediciones_boton_correcto_check'
  ) then
    alter table public.mediciones
      add constraint mediciones_boton_correcto_check
      check (boton_correcto between 0 and 2) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mediciones_boton_presionado_check'
  ) then
    alter table public.mediciones
      add constraint mediciones_boton_presionado_check
      check (
        boton_presionado is null
        or boton_presionado between 0 and 2
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mediciones_timeout_consistency_check'
  ) then
    alter table public.mediciones
      add constraint mediciones_timeout_consistency_check
      check (not timeout or exitoso = false) not valid;
  end if;
end $$;

commit;
