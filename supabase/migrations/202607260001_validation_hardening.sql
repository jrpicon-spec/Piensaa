begin;

alter table public.profiles
  add column if not exists telefono text,
  add column if not exists estado text not null default 'activo';

alter table public.profiles alter column email set not null;

create unique index if not exists profiles_email_unique_ci
  on public.profiles (lower(email));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id)
      on update cascade on delete cascade not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (rol in ('admin', 'cuidador')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (estado in ('activo', 'inactivo')) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pacientes_cuidador_id_fkey'
  ) then
    alter table public.pacientes
      add constraint pacientes_cuidador_id_fkey
      foreign key (cuidador_id) references public.profiles(id)
      on update cascade on delete set null not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'mediciones_paciente_id_fkey'
  ) then
    alter table public.mediciones
      add constraint mediciones_paciente_id_fkey
      foreign key (paciente_id) references public.pacientes(id)
      on update cascade on delete cascade not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'mediciones_tiempo_reaccion_check'
  ) then
    alter table public.mediciones
      add constraint mediciones_tiempo_reaccion_check
      check (tiempo_reaccion between 1 and 60000) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'pacientes_sexo_check'
  ) then
    alter table public.pacientes
      add constraint pacientes_sexo_check
      check (sexo in ('masculino', 'femenino', 'otro')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'pacientes_estado_check'
  ) then
    alter table public.pacientes
      add constraint pacientes_estado_check
      check (estado in ('normal', 'atencion', 'riesgo')) not valid;
  end if;
end $$;

create table if not exists public.system_settings (
  id uuid primary key,
  notifications boolean not null default true,
  email_alerts boolean not null default true,
  sound_alerts boolean not null default false,
  auto_refresh boolean not null default true,
  language text not null default 'es'
    check (language in ('es', 'en')),
  threshold_normal integer not null default 350
    check (threshold_normal between 1 and 59999),
  threshold_atencion integer not null default 500
    check (
      threshold_atencion between 2 and 60000
      and threshold_atencion > threshold_normal
    ),
  retention_days integer not null default 365
    check (retention_days between 1 and 3650),
  api_base_url text not null default 'http://localhost:3000',
  websocket_url text not null default 'ws://localhost:3000/device',
  mqtt_url text,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

insert into public.system_settings (id)
values ('00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

commit;
