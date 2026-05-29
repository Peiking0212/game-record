-- Seed data for local MVP testing
-- Safe to run multiple times.

insert into public.games (steam_app_id, name, genres, cover_url)
values
  (570, 'Dota 2', array['MOBA', 'Strategy'], null),
  (730, 'Counter-Strike 2', array['FPS', 'Action'], null),
  (413150, 'Stardew Valley', array['Indie', 'Simulation'], null)
on conflict (steam_app_id) do update
set
  name = excluded.name,
  genres = excluded.genres,
  cover_url = excluded.cover_url,
  updated_at = now();
