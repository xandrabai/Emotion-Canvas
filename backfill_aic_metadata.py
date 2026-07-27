"""
Backfill AIC metadata fields for existing rows in the `paintings` table.

What this does:
  1. Reads all `id` values already in your `paintings` table.
  2. Batch-fetches the corresponding records from the AIC API (up to 100 ids per request).
  3. Updates each row with: artist_display, date_display, image_id, is_public_domain,
     classification_title, style_titles, subject_titles, aic_color.
     (Note: is_has_image is not a real AIC API field -- it was removed from this
     script. "Has image" is correctly determined by image_id IS NOT NULL instead.)

What this does NOT do:
  - It does not touch dominant_colors, brightness, saturation, valence_score,
    arousal_score, energy_tag, or texture_tag — those are computed by your own
    pipeline in a separate step (color extraction + Valdez & Mehrabian formula),
    not sourced from AIC.

Setup:
  pip install supabase requests --break-system-packages

  Set these environment variables before running:
    SUPABASE_URL   - your project's URL, e.g. https://xxxx.supabase.co
    SUPABASE_KEY   - service_role key (needed to write/update rows; do NOT expose
                     this key client-side or commit it to source control)

Usage:
  python backfill_aic_metadata.py
"""

import os
import time
import requests
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

AIC_FIELDS = [
    "id",
    "artist_display",
    "date_display",
    "image_id",
    "is_public_domain",
    "classification_title",
    "style_titles",
    "subject_titles",
    "color",
]

BATCH_SIZE = 100  # AIC API accepts multiple ids per request via ?ids=1,2,3
REQUEST_DELAY_SECONDS = 0.5  # be polite to the API between batches


def get_existing_ids():
    """Pull every id currently in the paintings table."""
    all_ids = []
    page_size = 1000
    start = 0
    while True:
        result = (
            supabase.table("paintings")
            .select("id")
            .range(start, start + page_size - 1)
            .execute()
        )
        rows = result.data
        if not rows:
            break
        all_ids.extend(row["id"] for row in rows)
        if len(rows) < page_size:
            break
        start += page_size
    return all_ids


def fetch_aic_batch(ids_batch):
    """Fetch a batch of artworks from the AIC API by id."""
    ids_param = ",".join(str(i) for i in ids_batch)
    fields_param = ",".join(AIC_FIELDS)
    url = f"https://api.artic.edu/api/v1/artworks?ids={ids_param}&fields={fields_param}&limit={len(ids_batch)}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json().get("data", [])


def update_row(record):
    """Write one AIC record's fields back into the matching paintings row."""
    update_payload = {
        "artist_display": record.get("artist_display"),
        "date_display": record.get("date_display"),
        "image_id": record.get("image_id"),
        "is_public_domain": record.get("is_public_domain"),
        "classification_title": record.get("classification_title"),
        "style_titles": record.get("style_titles"),
        "subject_titles": record.get("subject_titles"),
        "aic_color": record.get("color"),
    }
    supabase.table("paintings").update(update_payload).eq("id", record["id"]).execute()


def main():
    ids = get_existing_ids()
    print(f"Found {len(ids)} existing rows to backfill.")

    updated_count = 0
    failed_ids = []

    for i in range(0, len(ids), BATCH_SIZE):
        batch = ids[i : i + BATCH_SIZE]
        try:
            records = fetch_aic_batch(batch)
        except requests.RequestException as e:
            print(f"Batch starting at index {i} failed to fetch: {e}")
            failed_ids.extend(batch)
            continue

        for record in records:
            try:
                update_row(record)
                updated_count += 1
            except Exception as e:
                print(f"Failed to update id {record.get('id')}: {e}")
                failed_ids.append(record.get("id"))

        print(f"Processed batch {i // BATCH_SIZE + 1} "
              f"({min(i + BATCH_SIZE, len(ids))}/{len(ids)} ids)")
        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone. Updated {updated_count} rows.")
    if failed_ids:
        print(f"{len(failed_ids)} ids failed and may need a retry: {failed_ids}")


if __name__ == "__main__":
    main()
