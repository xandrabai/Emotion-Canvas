"""
Slice 0 distribution check (see ACTION_PLAN.md).

Pulls every scored painting from Supabase and reports whether valence_score
and arousal_score behave like an independent 2D space or a correlated,
effectively-1D one. Read-only: makes no writes to the database and does not
modify compute_valence_arousal.py / matching.py.

Setup:
  pip install pandas numpy scipy matplotlib python-dotenv
  (.env must have SUPABASE_URL / SUPABASE_KEY, same as matching.py)

Usage:
  python scripts/inspect_scores.py
"""

import os

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from scipy.stats import pearsonr
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PAGE_SIZE = 1000
GRID_SIZE = 10
SPARSE_THRESHOLD = 5

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLOT_PATH = os.path.join(SCRIPT_DIR, "score_distribution.png")


def fetch_scores():
    """Pull id, valence_score, arousal_score for every fully-scored row."""
    rows = []
    start = 0
    while True:
        result = (
            supabase.table("paintings")
            .select("id, valence_score, arousal_score")
            .not_.is_("valence_score", "null")
            .not_.is_("arousal_score", "null")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        )
        batch = result.data
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return pd.DataFrame(rows)


def report_summary_stats(df):
    print(f"count: {len(df)}\n")
    for col in ("valence_score", "arousal_score"):
        series = df[col]
        print(f"{col}:")
        print(f"  min={series.min():.3f}  max={series.max():.3f}  "
              f"mean={series.mean():.3f}  std={series.std():.3f}")
        p5, p95 = np.percentile(series, [5, 95])
        print(f"  p5={p5:.3f}  p95={p95:.3f}\n")


def report_correlation(df):
    r, p = pearsonr(df["valence_score"], df["arousal_score"])
    print(f"Pearson correlation (valence_score, arousal_score): r={r:.3f} (p={p:.3g})\n")
    return r


def report_quadrants(df):
    v, a = df["valence_score"], df["arousal_score"]
    quadrants = {
        "valence>=0, arousal>=0 (excited)": ((v >= 0) & (a >= 0)).sum(),
        "valence<0,  arousal>=0 (tense)": ((v < 0) & (a >= 0)).sum(),
        "valence<0,  arousal<0  (depressed)": ((v < 0) & (a < 0)).sum(),
        "valence>=0, arousal<0  (serene)": ((v >= 0) & (a < 0)).sum(),
    }
    print("Per-quadrant counts (sign-based):")
    for label, count in quadrants.items():
        print(f"  {label}: {count}")
    print()


def report_grid_sparsity(df):
    v, a = df["valence_score"], df["arousal_score"]
    v_edges = np.linspace(v.min(), v.max(), GRID_SIZE + 1)
    a_edges = np.linspace(a.min(), a.max(), GRID_SIZE + 1)
    grid, _, _ = np.histogram2d(v, a, bins=[v_edges, a_edges])
    total_cells = GRID_SIZE * GRID_SIZE
    sparse_cells = int((grid < SPARSE_THRESHOLD).sum())
    empty_cells = int((grid == 0).sum())
    print(f"10x10 grid over occupied range: {sparse_cells}/{total_cells} cells "
          f"have fewer than {SPARSE_THRESHOLD} artworks "
          f"({empty_cells} of those are completely empty).\n")
    return sparse_cells


def save_scatter_plot(df):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.scatter(df["valence_score"], df["arousal_score"], s=8, alpha=0.5)
    ax.set_xlabel("valence_score")
    ax.set_ylabel("arousal_score")
    ax.set_title("valence_score vs arousal_score")
    ax.axhline(0, color="gray", linewidth=0.5)
    ax.axvline(0, color="gray", linewidth=0.5)
    fig.tight_layout()
    fig.savefig(PLOT_PATH, dpi=150)
    print(f"Scatter plot saved to {PLOT_PATH}\n")


def classify_decision_row(r, df):
    v, a = df["valence_score"], df["arousal_score"]
    v_span = v.max() - v.min()
    a_span = a.max() - a.min()
    # "Widely spread" here means the observed range covers most of a
    # plausible -1..1 axis; anything markedly narrower counts as compressed.
    widely_spread = v_span > 1.2 and a_span > 1.2
    r_abs = abs(r)

    if r_abs > 0.7:
        row = "|r| > 0.7 -- axes are redundant, 1D wearing a costume"
    elif r_abs < 0.5 and widely_spread:
        row = "|r| < 0.5, scores spread widely -- healthy 2D space"
    elif r_abs < 0.5:
        row = "|r| < 0.5, scores clustered in a sub-range -- 2D but compressed"
    else:
        row = ("0.5 <= |r| <= 0.7 -- outside the two defined buckets; "
               "meaningful correlation, not yet fully redundant")

    print(f"Decision table row: {row}")
    print(f"  (r={r:.3f}, valence span={v_span:.3f}, arousal span={a_span:.3f})")


def main():
    df = fetch_scores()
    if df.empty:
        print("No rows with non-null valence_score and arousal_score found.")
        return

    report_summary_stats(df)
    r = report_correlation(df)
    report_quadrants(df)
    report_grid_sparsity(df)
    save_scatter_plot(df)
    classify_decision_row(r, df)


if __name__ == "__main__":
    main()
