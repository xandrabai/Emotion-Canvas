"""
Artwork matching layer (PRD Epic C).

This module wraps calls to the `match_paintings` Supabase RPC function
(see match_paintings_function.sql) for the two matching moments in the
product flow:
  1. Initial match, right after the user's check-in tap
  2. Reshuffle ("show me different ones"), excluding what's already been shown

This is NOT a standalone script to run manually -- it's meant to be imported
by whatever serves your app's backend (a Flask/FastAPI route, a serverless
function, etc.) once that layer exists. For now, you can also run it
directly (see the __main__ block) to sanity-check the matching function
against real data while the rest of the app isn't built yet.

Setup:
  pip install supabase --break-system-packages
  (SUPABASE_URL / SUPABASE_KEY env vars, same as the other scripts)
"""

import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_initial_matches(valence: float, arousal: float, match_count: int = 5):
    """
    Call this right after the user taps a point on the 2D check-in field.
    Returns the `match_count` closest artworks with no exclusions.
    """
    result = supabase.rpc("match_paintings", {
        "target_valence": valence,
        "target_arousal": arousal,
        "exclude_ids": [],
        "match_count": match_count,
    }).execute()
    return result.data


def reshuffle_matches(valence: float, arousal: float, shown_ids: list, match_count: int = 5):
    """
    Call this when the user taps "show me different ones".
    `shown_ids` should be every artwork id already shown this session,
    so the next batch doesn't repeat any of them.
    """
    result = supabase.rpc("match_paintings", {
        "target_valence": valence,
        "target_arousal": arousal,
        "exclude_ids": shown_ids,
        "match_count": match_count,
    }).execute()
    return result.data


if __name__ == "__main__":
    # Quick manual sanity check -- simulates a check-in tap and one reshuffle
    valence, arousal = 0.65, 0.3

    first_batch = get_initial_matches(valence, arousal)
    print(f"Initial matches ({len(first_batch)}):")
    for m in first_batch:
        print(f"  {m['title']} -- distance {m['distance']:.3f}")

    shown_ids = [m["id"] for m in first_batch]
    second_batch = reshuffle_matches(valence, arousal, shown_ids)
    print(f"\nReshuffled matches ({len(second_batch)}), excluding {shown_ids}:")
    for m in second_batch:
        print(f"  {m['title']} -- distance {m['distance']:.3f}")
