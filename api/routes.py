"""
HTTP endpoints only -- matching logic lives in matching.py, response shaping
only happens here.

Hard guardrail (CLAUDE.md #3): title/artist/date/genre never travel in the
match or default-set payloads. Metadata is served only on demand, after
painting, via GET /artwork/{id}/meta.

Image source: Supabase Storage (storage_image_url), never AIC's IIIF
endpoint at request time. AIC is blocked by Cloudflare bot protection for
direct <img> hotlinks (worse on mobile) -- see CLAUDE.md's IIIF section for
the debugging history. AIC is touched exclusively by the offline scoring/
backfill pipeline (compute_valence_arousal.py). A row with no
storage_image_url is dropped here rather than falling back to an AIC URL,
so a missing backfill fails loudly (fewer/no results) instead of silently
reintroducing the bug this was built to fix.
"""

import logging
import random
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api import config  # noqa: F401  (loads .env before matching.py is imported)
from matching import get_initial_matches, reshuffle_matches, supabase

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_SET_POOL_SIZE = 200


def _to_client_shape(rows):
    artworks = []
    for row in rows:
        storage_url = row.get("storage_image_url")
        if not storage_url:
            logger.warning(
                "Dropping artwork id=%s from results: storage_image_url is not set "
                "(backfill incomplete for this row)",
                row.get("id"),
            )
            continue
        artworks.append({"id": row["id"], "image_url": storage_url})
    return artworks


class MatchRequest(BaseModel):
    valence: float
    arousal: float
    exclude_ids: List[int] = []


class DefaultSetRequest(BaseModel):
    exclude_ids: List[int] = []
    match_count: int = 5


@router.post("/match")
def match(body: MatchRequest):
    if body.exclude_ids:
        rows = reshuffle_matches(body.valence, body.arousal, body.exclude_ids)
    else:
        rows = get_initial_matches(body.valence, body.arousal)
    return {"artworks": _to_client_shape(rows)}


@router.post("/default-set")
def default_set(body: DefaultSetRequest):
    result = (
        supabase.table("paintings")
        .select("id, storage_image_url")
        .not_.is_("storage_image_url", "null")
        .not_.is_("valence_score", "null")
        .not_.is_("arousal_score", "null")
        .eq("is_public_domain", True)
        .limit(DEFAULT_SET_POOL_SIZE)
        .execute()
    )
    pool = [row for row in result.data if row["id"] not in body.exclude_ids]
    sample = random.sample(pool, k=min(body.match_count, len(pool)))
    return {"artworks": _to_client_shape(sample)}


@router.get("/artwork/{artwork_id}/meta")
def artwork_meta(artwork_id: int):
    """Called on demand by the optional 'i' button, after painting -- never before."""
    result = (
        supabase.table("paintings")
        .select("title, artist_display, date_display, classification_title")
        .eq("id", artwork_id)
        .maybe_single()
        .execute()
    )
    if result.data is None:
        raise HTTPException(status_code=404, detail="not found")
    row = result.data
    return {
        "title": row.get("title"),
        "artist": row.get("artist_display"),
        "date": row.get("date_display"),
        "genre": row.get("classification_title"),
    }
