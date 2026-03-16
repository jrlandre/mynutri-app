-- Nutricionistas (tenants B2B)
create table nutritionists (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  subdomain     text unique not null,
  name          text not null,
  system_prompt text,
  plan          text not null default 'standard'
                check (plan in ('standard', 'enterprise')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Pacientes (usuários B2B vinculados a uma nutricionista)
create table patients (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users on delete cascade,
  nutritionist_id     uuid references nutritionists on delete cascade,
  active              boolean not null default true,
  magic_link_token    text unique,
  invited_at          timestamptz not null default now(),
  activated_at        timestamptz,
  unique (user_id, nutritionist_id)
);

-- Contagem de uso diário por usuário
create table usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  date            date not null default current_date,
  analysis_count  integer not null default 0,
  unique (user_id, date)
);

-- RLS
alter table nutritionists enable row level security;
alter table patients enable row level security;
alter table usage enable row level security;

-- Políticas
create policy "Nutricionista vê seus próprios dados"
  on nutritionists for all
  using (auth.uid() = user_id);

create policy "Paciente vê seus próprios dados"
  on patients for all
  using (auth.uid() = user_id);

create policy "Usuário vê seu próprio uso"
  on usage for all
  using (auth.uid() = user_id);
