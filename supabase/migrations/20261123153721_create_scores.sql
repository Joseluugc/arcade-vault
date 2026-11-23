create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null check (game_id ~ '^[a-z0-9-]{1,32}$'),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,10}$'),
  score integer not null check (score between 1 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_rank_idx
  on public.scores (game_id, score desc, created_at);

alter table public.scores enable row level security;

create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: nadie puede modificar ni borrar desde la API.
