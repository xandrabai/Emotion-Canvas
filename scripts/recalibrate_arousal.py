"""
One-time recalibration for arousal_score's edge-density blend (see
ACTION_PLAN.md and scripts/inspect_scores.py -- old formula had
r=-0.558 between valence_score and arousal_score across all 2861 rows).

A 40-row sample test (see conversation, not checked in) showed a naive 50/50
raw blend of edge_density into arousal barely moved the correlation, because
edge_density's natural variance is much smaller than base_arousal's. This
script instead z-score-normalizes both terms against the FULL population
before blending, so the requested weight is honored in practice, then rescales
the result back onto base_arousal's original scale so it stays comparable to
valence_score for the Euclidean KNN matching in match_paintings().

Three phases, run separately and in order. Only --apply writes to Supabase.

  --collect     Downloads every painting with an image_id, extracts
                brightness/saturation/edge_density, and appends results to
                scripts/arousal_recalibration_cache.csv. Resumable -- skips
                ids already cached, so a network failure partway through
                just needs a re-run. No DB writes.

  --calibrate   Reads the cache (no network). Reports population mean/std for
                edge_density and base_arousal, and the resulting
                valence/arousal correlation for a range of candidate blend
                weights, so you can pick one. No DB writes.

  --apply W     Reads the cache (no network) and writes final valence_score /
                arousal_score for every cached id using blend weight W
                (0=pure old formula, 1=pure edge density). The only mode that
                touches Supabase.

Usage:
  python scripts/recalibrate_arousal.py --collect
  python scripts/recalibrate_arousal.py --calibrate
  python scripts/recalibrate_arousal.py --apply 0.6
"""

import argparse
import csv
import os
import sys
import time

import numpy as np
from dotenv import load_dotenv
from scipy.stats import pearsonr

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, REPO_ROOT)

load_dotenv(os.path.join(REPO_ROOT, ".env"))

from compute_valence_arousal import fetch_image, extract_color_features, supabase  # noqa: E402
CACHE_PATH = os.path.join(SCRIPT_DIR, "arousal_recalibration_cache.csv")
CACHE_FIELDS = ["id", "image_id", "brightness", "saturation", "edge_density", "old_valence_score", "old_arousal_score"]
PAGE_SIZE = 1000
REQUEST_DELAY_SECONDS = 0.3
CANDIDATE_WEIGHTS = [0.0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]


def get_all_scored_rows():
    all_rows = []
    start = 0
    while True:
        result = (
            supabase.table("paintings")
            .select("id, image_id, valence_score, arousal_score")
            .not_.is_("image_id", "null")
            .not_.is_("valence_score", "null")
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


def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, newline="") as f:
        return {int(row["id"]): row for row in csv.DictReader(f)}


def append_to_cache(row):
    write_header = not os.path.exists(CACHE_PATH)
    with open(CACHE_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CACHE_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def collect():
    rows = get_all_scored_rows()
    cached = load_cache()
    todo = [r for r in rows if r["id"] not in cached]
    print(f"{len(rows)} scored rows total, {len(cached)} already cached, {len(todo)} to fetch.")

    failed = []
    for i, row in enumerate(todo, start=1):
        try:
            image = fetch_image(row["image_id"])
            _, brightness, saturation, edge_density = extract_color_features(image)
            append_to_cache({
                "id": row["id"],
                "image_id": row["image_id"],
                "brightness": brightness,
                "saturation": saturation,
                "edge_density": edge_density,
                "old_valence_score": row["valence_score"],
                "old_arousal_score": row["arousal_score"],
            })
        except Exception as e:
            print(f"Failed on id {row['id']} (image_id {row['image_id']}): {e}")
            failed.append(row["id"])

        if i % 50 == 0 or i == len(todo):
            print(f"Fetched {i}/{len(todo)}")
        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone. Cache now has {len(load_cache())} rows.")
    if failed:
        print(f"{len(failed)} ids failed and may need a re-run of --collect: {failed}")


def _compute_blend(cache_rows, weight):
    """z-score both terms against the full cached population, blend, then
    rescale back onto base_arousal's original mean/std."""
    brightness = np.array([float(r["brightness"]) for r in cache_rows])
    saturation = np.array([float(r["saturation"]) for r in cache_rows])
    edge_density = np.array([float(r["edge_density"]) for r in cache_rows])
    valence = np.array([float(r["old_valence_score"]) for r in cache_rows])

    base_arousal = -0.31 * brightness + 0.60 * saturation
    base_mean, base_std = base_arousal.mean(), base_arousal.std()
    edge_mean, edge_std = edge_density.mean(), edge_density.std()

    base_z = (base_arousal - base_mean) / base_std
    edge_z = (edge_density - edge_mean) / edge_std
    blended_z = (1 - weight) * base_z + weight * edge_z

    blended_std = blended_z.std()
    final_arousal = base_mean + (blended_z / blended_std) * base_std
    return valence, final_arousal, base_mean, base_std, edge_mean, edge_std, blended_std


def calibrate():
    cache = load_cache()
    if not cache:
        print("Cache is empty -- run --collect first.")
        return
    cache_rows = list(cache.values())
    print(f"Calibrating against {len(cache_rows)} cached rows.\n")

    r_old, _ = pearsonr(
        [float(r["old_valence_score"]) for r in cache_rows],
        [float(r["old_arousal_score"]) for r in cache_rows],
    )
    print(f"Old formula r (full population): {r_old:.3f}\n")

    print(f"{'weight':>8} | {'r(valence, arousal)':>20}")
    for w in CANDIDATE_WEIGHTS:
        valence, final_arousal, *_ = _compute_blend(cache_rows, w)
        r, _ = pearsonr(valence, final_arousal)
        print(f"{w:>8.1f} | {r:>20.3f}")

    print(
        "\nPick the weight with the lowest |r| that you're comfortable with, "
        "then run: python scripts/recalibrate_arousal.py --apply <weight>"
    )


def apply(weight):
    cache = load_cache()
    if not cache:
        print("Cache is empty -- run --collect first.")
        return
    cache_rows = list(cache.values())
    valence, final_arousal, base_mean, base_std, edge_mean, edge_std, blended_std = _compute_blend(cache_rows, weight)
    r, _ = pearsonr(valence, final_arousal)
    print(f"Applying weight={weight}. Resulting r(valence, arousal) = {r:.3f} across {len(cache_rows)} rows.")

    updated = 0
    for row, arousal in zip(cache_rows, final_arousal):
        supabase.table("paintings").update({
            "arousal_score": round(float(arousal), 3),
        }).eq("id", int(row["id"])).execute()
        updated += 1
        if updated % 200 == 0:
            print(f"Updated {updated}/{len(cache_rows)}")

    print(f"\nDone. Updated arousal_score for {updated} rows.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--collect", action="store_true")
    group.add_argument("--calibrate", action="store_true")
    group.add_argument("--apply", type=float, metavar="WEIGHT")
    args = parser.parse_args()

    if args.collect:
        collect()
    elif args.calibrate:
        calibrate()
    elif args.apply is not None:
        apply(args.apply)
