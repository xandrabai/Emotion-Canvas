"""
Compute dominant_colors, brightness, saturation, valence_score, and arousal_score
for each row in the `paintings` table, using its image_id to fetch the actual
artwork image and analyze its pixels.

Method: Valdez & Mehrabian (1994) linear color-emotion formula for valence,
blended with edge density for arousal:
  valence_score = 0.69 * brightness + 0.22 * saturation
  base_arousal  = -0.31 * brightness + 0.60 * saturation
  arousal_score = 0.3 * base_arousal_z + 0.7 * edge_density_z, rescaled onto
                  base_arousal's original mean/std (z-scores computed against
                  the population stats baked in below)

Edge density was added because brightness/saturation alone drove valence and
arousal to a Pearson r=-0.558 across the existing 2861 scored paintings (see
scripts/inspect_scores.py) -- both scores shared the same brightness term
with opposite signs, so the "2D" check-in field was closer to 1D. Edge
density is tied to visual busyness/detail instead, to decorrelate the two
axes. A raw (non-normalized) blend barely moved the correlation, because
edge_density's natural variance is ~4x smaller than base_arousal's -- see
scripts/recalibrate_arousal.py, which calibrated this against the full
population and found weight=0.7 cuts r to -0.347. The constants below
(POPULATION_BASE_AROUSAL_MEAN/STD, POPULATION_EDGE_DENSITY_MEAN/STD) are that
same calibration, applied here so newly-scored paintings stay consistent
with the existing 2860 that were bulk-recalibrated.

This does NOT touch energy_tag/texture_tag -- those come from a separate
vision-model tagging pass (PRD Section 10.1, step 5), not from this script.

Setup:
  pip install supabase requests Pillow --break-system-packages

  Set these environment variables before running (same as the backfill script):
    SUPABASE_URL
    SUPABASE_KEY   (service_role key)

Usage:
  python compute_valence_arousal.py
"""

import os
import io
import time
import colorsys
import requests
from PIL import Image, ImageFilter
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# IIIF image endpoint -- 400px wide is plenty for color analysis, keeps downloads fast
IIIF_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg"

PAGE_SIZE = 500
REQUEST_DELAY_SECONDS = 0.3  # be polite to the IIIF image server
NUM_DOMINANT_COLORS = 5

# Population stats from scripts/recalibrate_arousal.py's calibration run
# (2860 rows, weight=0.7). Keep in sync if that script is ever re-run with a
# different weight or against a materially larger/different corpus.
AROUSAL_BLEND_WEIGHT = 0.7
POPULATION_BASE_AROUSAL_MEAN = -0.10954174609364058
POPULATION_BASE_AROUSAL_STD = 0.11647475232409184
POPULATION_EDGE_DENSITY_MEAN = 0.10309359672136141
POPULATION_EDGE_DENSITY_STD = 0.049768073958215614
POPULATION_BLENDED_Z_STD = 0.7954856531823288


def get_rows_to_process(rescore_all=False):
    """
    Pull rows that have an image_id. By default only rows never scored yet;
    pass rescore_all=True to re-score every row (used once, to apply the
    edge-density change retroactively to already-scored paintings).
    """
    all_rows = []
    start = 0
    while True:
        query = (
            supabase.table("paintings")
            .select("id, image_id")
            .not_.is_("image_id", "null")
        )
        if not rescore_all:
            query = query.is_("valence_score", "null")
        result = query.range(start, start + PAGE_SIZE - 1).execute()
        rows = result.data
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return all_rows


def fetch_image(image_id):
    """Download the artwork image via IIIF and return a PIL Image."""
    url = IIIF_URL_TEMPLATE.format(image_id=image_id)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/150.0.0.0 Safari/537.36"
        )
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=30
    )
    response.raise_for_status()

    return Image.open(io.BytesIO(response.content)).convert("RGB")


def extract_color_features(image):
    """
    Compute dominant colors, brightness, saturation, and edge density from a
    PIL Image. brightness/saturation/edge_density are normalized to 0-1.
    """
    # Downsample for speed -- exact pixel count doesn't matter for aggregate stats
    small = image.resize((150, 150))

    # Dominant colors via palette quantization
    quantized = small.quantize(colors=NUM_DOMINANT_COLORS)
    palette = quantized.getpalette()
    color_counts = quantized.getcolors()  # list of (count, palette_index)
    color_counts.sort(reverse=True)  # most frequent first

    dominant_colors = []
    for count, idx in color_counts[:NUM_DOMINANT_COLORS]:
        r = palette[idx * 3]
        g = palette[idx * 3 + 1]
        b = palette[idx * 3 + 2]
        dominant_colors.append({
            "rgb": [r, g, b],
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "weight": count,
        })

    # Average brightness/saturation across all pixels (HSV space)
    pixels = list(small.getdata())
    total_v = 0.0
    total_s = 0.0
    for r, g, b in pixels:
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        total_v += v
        total_s += s
    n = len(pixels)
    brightness = total_v / n
    saturation = total_s / n

    # Edge density: mean intensity of a Sobel-style edge map, normalized 0-1.
    # A busy/detailed painting scores higher regardless of how bright or
    # saturated it is -- independent of the brightness/saturation inputs
    # that valence_score is built from.
    edges = small.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_density = sum(edges.getdata()) / (n * 255.0)

    return dominant_colors, brightness, saturation, edge_density


def compute_valence_arousal(brightness, saturation, edge_density):
    """Valdez & Mehrabian (1994) linear formula for valence. Arousal blends
    in edge_density (z-scored against population stats, then rescaled back
    onto base_arousal's original scale) to decorrelate it from valence's
    brightness/saturation inputs -- see module docstring and
    scripts/recalibrate_arousal.py for how these constants were derived."""
    valence = 0.69 * brightness + 0.22 * saturation

    base_arousal = -0.31 * brightness + 0.60 * saturation
    base_z = (base_arousal - POPULATION_BASE_AROUSAL_MEAN) / POPULATION_BASE_AROUSAL_STD
    edge_z = (edge_density - POPULATION_EDGE_DENSITY_MEAN) / POPULATION_EDGE_DENSITY_STD
    blended_z = (1 - AROUSAL_BLEND_WEIGHT) * base_z + AROUSAL_BLEND_WEIGHT * edge_z
    arousal = POPULATION_BASE_AROUSAL_MEAN + (blended_z / POPULATION_BLENDED_Z_STD) * POPULATION_BASE_AROUSAL_STD

    return round(valence, 3), round(arousal, 3)


def update_row(row_id, dominant_colors, brightness, saturation, valence, arousal):
    supabase.table("paintings").update({
        "dominant_colors": dominant_colors,
        "brightness": round(brightness, 3),
        "saturation": round(saturation, 3),
        "valence_score": valence,
        "arousal_score": arousal,
    }).eq("id", row_id).execute()


def main(rescore_all=False):
    rows = get_rows_to_process(rescore_all=rescore_all)
    print(f"Found {len(rows)} rows to score.")

    processed = 0
    failed = []

    for i, row in enumerate(rows, start=1):
        row_id = row["id"]
        image_id = row["image_id"]
        try:
            image = fetch_image(image_id)
            dominant_colors, brightness, saturation, edge_density = extract_color_features(image)
            valence, arousal = compute_valence_arousal(brightness, saturation, edge_density)
            update_row(row_id, dominant_colors, brightness, saturation, valence, arousal)
            processed += 1
        except Exception as e:
            print(f"Failed on id {row_id} (image_id {image_id}): {e}")
            failed.append(row_id)

        if i % 50 == 0 or i == len(rows):
            print(f"Processed {i}/{len(rows)}")

        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone. Scored {processed} rows.")
    if failed:
        print(f"{len(failed)} ids failed and may need a retry: {failed}")


if __name__ == "__main__":
    import sys
    main(rescore_all="--rescore-all" in sys.argv)
