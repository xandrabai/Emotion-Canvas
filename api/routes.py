"""
HTTP endpoints only -- matching logic lives in matching.py, response shaping
only happens here.

Hard guardrail (CLAUDE.md #3): title/artist/date/genre never travel in the
match or default-set payloads. Metadata is served only on demand, after
painting, via GET /artwork/{id}/meta.
"""

import random
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api import config  # noqa: F401  (loads .env before matching.py is imported)
from matching import get_initial_matches, reshuffle_matches, supabase

router = APIRouter()

IIIF_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg"
DEFAULT_SET_POOL_SIZE = 200


def _to_client_shape(rows):
    return [
        {"id": row["id"], "image_url": IIIF_URL_TEMPLATE.format(image_id=row["image_id"])}
        for row in rows
        if row.get("image_id")
    ]


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
        .select("id, image_id")
        .not_.is_("image_id", "null")
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
