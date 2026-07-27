-- Artwork Matching Function (PRD Epic C) -- Efficient version
-- Uses Postgres's native `point` type + GiST index for index-accelerated
-- nearest-neighbor search, instead of computing distance for every row and
-- sorting the full table. Scales well as the dataset grows.
--
-- Run this in the Supabase SQL Editor.

-- 1. Add a generated point column combining valence/arousal into one 2D coordinate
ALTER TABLE paintings
  ADD COLUMN IF NOT EXISTS valence_arousal_point point
  GENERATED ALWAYS AS (point(valence_score::float8, arousal_score::float8)) STORED;

-- 2. GiST index enables the <-> "nearest neighbor" operator to use an index
--    scan instead of a full table scan + sort
CREATE INDEX IF NOT EXISTS idx_paintings_valence_arousal_gist
  ON paintings USING gist (valence_arousal_point);

-- 3. Partial index to keep the eligibility filter fast
-- (is_has_image is not a real AIC field; image_id IS NOT NULL is the correct
-- "has image" check, so it's used here instead)
CREATE INDEX IF NOT EXISTS idx_paintings_eligible
  ON paintings (is_public_domain)
  WHERE is_public_domain = true AND image_id IS NOT NULL;

-- 4. Matching function using the indexed <-> operator
CREATE OR REPLACE FUNCTION match_paintings(
  target_valence NUMERIC,
  target_arousal NUMERIC,
  exclude_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  artist_display TEXT,
  image_id TEXT,
  valence_score NUMERIC,
  arousal_score NUMERIC,
  distance FLOAT8
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.artist_display,
    p.image_id,
    p.valence_score,
    p.arousal_score,
    p.valence_arousal_point <-> point(target_valence::float8, target_arousal::float8) AS distance
  FROM paintings p
  WHERE
    p.valence_score IS NOT NULL
    AND p.arousal_score IS NOT NULL
    AND p.is_public_domain = true
    AND p.image_id IS NOT NULL
    AND NOT (p.id = ANY(exclude_ids))
  ORDER BY p.valence_arousal_point <-> point(target_valence::float8, target_arousal::float8)
  LIMIT match_count;
$$;
