-- CREDI GESTIÓN ONLINE - Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dni varchar(8) not null,
  nombre text not null,
  telefono text default '',
  direccion text default '',
  created_at timestamptz not null default now(),
  unique(user_id, dni)
);

create table if not exists public.creditos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  monto numeric(12,2) not null check (monto > 0),
  interes numeric(7,2) not null default 0 check (interes >= 0),
  cuotas integer not null check (cuotas between 1 and 240),
  frecuencia text not null check (frecuencia in ('Diaria','Semanal','Quincenal','Mensual')),
  fecha_desembolso date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credito_id uuid not null references public.creditos(id) on delete restrict,
  cuota integer not null check (cuota >= 1),
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null,
  observacion text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('Ingreso','Egreso')),
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null,
  concepto text not null,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;
alter table public.creditos enable row level security;
alter table public.pagos enable row level security;
alter table public.movimientos_caja enable row level security;

drop policy if exists clientes_all on public.clientes;
create policy clientes_all on public.clientes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists creditos_all on public.creditos;
create policy creditos_all on public.creditos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists pagos_all on public.pagos;
create policy pagos_all on public.pagos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists caja_all on public.movimientos_caja;
create policy caja_all on public.movimientos_caja for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_clientes_user on public.clientes(user_id);
create index if not exists idx_creditos_user on public.creditos(user_id);
create index if not exists idx_creditos_cliente on public.creditos(cliente_id);
create index if not exists idx_pagos_credito on public.pagos(credito_id);
create index if not exists idx_caja_user on public.movimientos_caja(user_id);
