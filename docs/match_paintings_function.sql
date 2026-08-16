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
  WHERE is_public_domain = true AND image_id IS NOT NULL AND storage_image_url IS NOT NULL;

-- 4. Matching function using the indexed <-> operator
--
-- storage_image_url is required, not optional: the runtime image source is
-- Supabase Storage, not AIC's IIIF endpoint (that's blocked by Cloudflare bot
-- protection for direct <img> hotlinks, worse on mobile). image_id is kept
-- for attribution metadata only -- AIC is touched exclusively by the offline
-- scoring/backfill pipeline (compute_valence_arousal.py), never at request
-- time. A row with a null storage_image_url is excluded here rather than
-- falling back to constructing an AIC URL, so a missing backfill fails
-- loudly (fewer/no results) instead of silently reintroducing the bug this
-- was built to fix.
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
  storage_image_url TEXT,
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
    p.storage_image_url,
    p.valence_score,
    p.arousal_score,
    p.valence_arousal_point <-> point(target_valence::float8, target_arousal::float8) AS distance
  FROM paintings p
  WHERE
    p.valence_score IS NOT NULL
    AND p.arousal_score IS NOT NULL
    AND p.is_public_domain = true
    AND p.image_id IS NOT NULL
    AND p.storage_image_url IS NOT NULL
    AND NOT (p.id = ANY(exclude_ids))
  ORDER BY p.valence_arousal_point <-> point(target_valence::float8, target_arousal::float8)
  LIMIT match_count;
$$;
