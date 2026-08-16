"""
Backfills storage_image_url for every scored painting that doesn't have one
yet. match_paintings() (docs/match_paintings_function.sql) now requires
storage_image_url to be set -- without this backfill, /api/match and
/api/default-set return zero results for everyone.

Downloads each painting's image from AIC's IIIF endpoint, uploads it to the
`artwork-images` Supabase Storage bucket, and writes the resulting public
URL back to storage_image_url -- one row at a time, no concurrency, writing
immediately after each success so a partial run never loses progress.

Resumable and idempotent: only queries rows where storage_image_url IS NULL,
so re-running after a crash, a network hiccup, or Ctrl-C just picks up
whatever's left, including anything that failed last time (a failed row
never got its storage_image_url set, so it's still eligible next run).

Uses the "!843,843" bounding-box IIIF size syntax, not the exact-width form
("843,") -- the exact-width form 403s with "Requests for scales in excess of
100% are not allowed" for any painting whose original scan is narrower than
843px, which is common enough in this collection to break a meaningful
fraction of it (see CLAUDE.md's IIIF section).

Usage:
  python scripts/backfill_storage_images.py
"""

import json
import os
import sys
import time

import requests
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, REPO_ROOT)

load_dotenv(os.path.join(REPO_ROOT, ".env"))

from supabase import create_client  # noqa: E402

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

IIIF_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{image_id}/full/!843,843/0/default.jpg"
STORAGE_BUCKET = "artwork-images"
PAGE_SIZE = 500
REQUEST_DELAY_SECONDS = 0.3  # same as compute_valence_arousal.py -- be polite to the IIIF image server
PROGRESS_LOG_INTERVAL = 50
FAILURES_PATH = os.path.join(SCRIPT_DIR, "backfill_storage_failures.json")

# Same header compute_valence_arousal.py uses for AIC fetches.
IIIF_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/150.0.0.0 Safari/537.36"
    )
}


def get_rows_to_backfill():
    """Scored rows with an AIC image_id but no storage_image_url yet."""
    all_rows = []
    start = 0
    while True:
        result = (
            supabase.table("paintings")
            .select("id, image_id")
            .not_.is_("image_id", "null")
            .not_.is_("valence_score", "null")
            .is_("storage_image_url", "null")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        )
        rows = result.data
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return all_rows


def fetch_image_bytes(image_id):
    """Download the artwork image via IIIF and return the raw bytes."""
    url = IIIF_URL_TEMPLATE.format(image_id=image_id)
    response = requests.get(url, headers=IIIF_REQUEST_HEADERS, timeout=30)
    response.raise_for_status()
    return response.content


def upload_to_storage(row_id, image_bytes):
    """Upload to the artwork-images bucket and return its public URL."""
    path = f"{row_id}.jpg"
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path,
        image_bytes,
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    return supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)


def update_row(row_id, storage_url):
    supabase.table("paintings").update({"storage_image_url": storage_url}).eq("id", row_id).execute()


def main():
    rows = get_rows_to_backfill()
    total = len(rows)
    print(f"{total} rows need backfilling.")
    if total == 0:
        print("Nothing to do -- every scored row already has a storage_image_url.")
        return

    succeeded = 0
    failed = []

    for i, row in enumerate(rows, start=1):
        row_id = row["id"]
        image_id = row["image_id"]
        try:
            image_bytes = fetch_image_bytes(image_id)
            storage_url = upload_to_storage(row_id, image_bytes)
            update_row(row_id, storage_url)
            succeeded += 1
        except Exception as e:
            print(f"FAILED id={row_id} (image_id={image_id}): {e}")
            failed.append({"id": row_id, "image_id": image_id, "error": str(e)})

        if i % PROGRESS_LOG_INTERVAL == 0 or i == total:
            print(f"Progress: {i}/{total} processed ({succeeded} succeeded, {len(failed)} failed)")

        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone. {succeeded}/{total} succeeded, {len(failed)} failed.")
    if failed:
        failed_ids = [f["id"] for f in failed]
        print(f"Failed ids: {failed_ids}")
        with open(FAILURES_PATH, "w") as f:
            json.dump(failed, f, indent=2)
        print(
            f"Failure details written to {FAILURES_PATH}. "
            f"Just re-run this script to retry them -- it only queries rows "
            f"still missing storage_image_url, so failed rows are automatically picked up again."
        )


if __name__ == "__main__":
    main()
