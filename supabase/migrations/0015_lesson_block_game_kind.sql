-- 0015_lesson_block_game_kind.sql
-- Nuevo tipo de bloque de lección: 'game' (juegos interactivos dentro de la
-- lección). Va en su propia migración porque un valor de enum recién añadido no
-- se puede usar en la misma transacción (lo usa 0016).
alter type public.lesson_block_kind add value if not exists 'game';
