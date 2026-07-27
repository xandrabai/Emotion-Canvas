# Action Plan — Connect the Built UI to Real Artwork Data

**Status as of July 26, 2026**

Two halves of this product are built and working. They are not connected.

| Built and working | Not built |
|---|---|
| Full React UI: welcome → check-in → gallery → canvas → close | Any backend at all |
| Canvas: brush, eraser, undo, clear, palette, opacity slider | Any call to the real matching function |
| Supabase schema, valence/arousal scoring, `match_paintings` RPC | Any real artwork data in the UI |
| `matching.py` wrapper (initial match + reshuffle) | Persistence of finished paintings |

The UI currently runs on **8 hardcoded fake artworks** — Unsplash stock photos with
invented titles attributed to real painters. Everything below is about replacing
that with live AIC data and closing five gaps against the PRD.

Reference: `docs/Digital_Art_Therapy_PRD.md` (v1.3.1) · `CLAUDE.md` for guardrails.

---

## Slice 0 — Setup and reality check

**Start here.** Two parts: five minutes by hand, then one script.

### Part A — do this yourself first

Nothing else works until these exist.

```bash
cd "~/Downloads/Frontend design for product"

# 1. Git — without this you can't review or revert anything Claude Code does
git init
printf '.env\nnode_modules/\n.venv/\n.DS_Store\ndist/\n' > .gitignore
git add -A && git commit -m "Initial commit: Figma Make UI export + data pipeline"

# 2. Env vars — matching.py reads these at import time and will crash without them
cat > .env <<'ENVEOF'
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-service-role-key
ENVEOF
# then fill in the real values

# 3. Deps for the inspection script
pip install pandas numpy scipy matplotlib python-dotenv
```

Also delete the stale PRD copy at `src/imports/Digital_Art_Therapy_PRD.md` —
it's v1.0 and superseded by `docs/Digital_Art_Therapy_PRD.md`.

### Part B — the distribution check

**Why this comes before any wiring:** your valence and arousal scores are both
derived from brightness and saturation via the Valdez & Mehrabian formula. If
they're highly correlated, your 2D field is really a 1D field — two opposite
corners sit empty, and every tap in those regions returns the same few artworks.
The check-in UI already maps taps to the full −1..1 square, so this determines
whether that mapping needs to change.

**Prompt for Claude Code:**

> Read `compute_valence_arousal.py`, `matching.py`, and
> `docs/match_paintings_function.sql` to understand the schema and the actual
> score ranges — verify, don't assume.
>
> Write `scripts/inspect_scores.py` that loads credentials from `.env`, pulls all
> artworks with non-null valence and arousal scores from Supabase, and reports:
>
> - count, and min/max/mean/std for each score
> - 5th and 95th percentile for each score
> - **Pearson correlation between valence_score and arousal_score**
> - per-quadrant counts
> - over a 10x10 grid across the occupied range, how many cells hold fewer than 5 artworks
> - a scatter plot saved as PNG
>
> Don't modify any existing code. Then tell me which row of the decision table in
> `ACTION_PLAN.md` Slice 0 the data falls into, and why.

Then run it: `python scripts/inspect_scores.py`

### What to do with the result

| What you see | What it means | Action |
|---|---|---|
| r < 0.5, scores spread widely | Healthy 2D space | Nothing. Go to Slice 1. |
| r < 0.5, scores clustered in a sub-range | 2D but compressed | Map taps onto p5–p95 instead of the full −1..1 range. One function in `CheckInScreen`. |
| r > 0.7 | Axes are redundant — 1D wearing a costume | See below before building. |

**If r > 0.7:** do *not* rank-normalize each axis independently — that spreads the
marginals but leaves points on a diagonal, so it looks fixed without being fixed.
Two real options:

- **Accept for MVP.** The user never sees the scatter plot and the loop still
  functions. Log it as a known limitation; Phase 2 deep-learning scoring
  (Section 10.3) addresses it properly.
- **Add one decorrelating signal to arousal.** Edge density is the best cheap
  candidate — a few lines with PIL, genuinely tied to visual activity rather than
  brightness. Roughly half a day, meaningfully better match quality.

**Report back: the r value, the p5/p95 for each score, and the sparse-cell count.**

---

## Slice 1 — FastAPI backend

Three endpoints wrapping the matching function you already have. `matching.py`
already exposes exactly what's needed — import it, don't rewrite it.

Note the metadata split: `/api/match` deliberately returns **no** title or artist.
That's PRD F2 enforced at the API layer, so a UI bug can't leak it.

**Prompt:**

> Read `matching.py` for the exact function signatures and return shape.
>
> Create a FastAPI backend in `api/`:
> - `api/config.py` — loads SUPABASE_URL and SUPABASE_KEY from `.env` via pydantic-settings
> - `api/main.py` — app entrypoint, CORS allowing the Vite dev origin (http://localhost:5173)
> - `api/routes.py` — three endpoints:
>   - `POST /api/match` — body `{valence, arousal, exclude_ids: list = []}`.
>     Calls `get_initial_matches` or `reshuffle_matches` depending on whether
>     exclude_ids is empty. Returns `{id, image_url}` only, where image_url is the
>     AIC IIIF URL. **No title, artist, date, or genre in this response** — hard
>     requirement, see CLAUDE.md.
>   - `POST /api/default-set` — body `{exclude_ids: list = []}`. Returns 4–5
>     artworks from a rotating default set. Same response shape. This is the skip path.
>   - `GET /api/artworks/{id}/meta` — returns title, artist, date, genre. The only
>     endpoint that exposes metadata.
>
> Add `requirements.txt` and `scripts/smoke_test.py` hitting all three. Tell me
> the command to run the server.

**Done when:** curling `/api/match` returns image URLs that load in a browser.

---

## Slice 2 — Replace the mock data

The big one. Deletes the fabricated artworks entirely.

**Prompt:**

> In `src/app/App.tsx`, replace all mock data with live API calls.
>
> - Create `src/lib/api.ts` with typed functions for the three endpoints and a
>   `VITE_API_URL` env var.
> - **Delete the `ARTWORKS` constant, `getMatchedArtworks()`, and
>   `getRandomArtworks()` entirely.** Do not keep them as fallbacks.
> - Change the `Artwork` type so title/artist/year/medium are optional — they
>   aren't present until fetched separately.
> - `handleCheckIn` calls `/api/match`; `handleSkip` calls `/api/default-set`.
> - Add loading and error states. Copy must follow the tone rules in CLAUDE.md —
>   no spinners with clinical text, no raw error codes. List every string you
>   write so I can review it.
>
> Don't change the visual design, layout, or animation timing.

**Done when:** you tap the field and see real AIC paintings.

---

## Slice 3 — Fix reshuffle

Currently `onShuffle` calls `getRandomArtworks()`, throwing away the check-in
coordinates and passing no exclusions, so artworks repeat. PRD C3 requires
reshuffling within the same matched pool.

**Prompt:**

> Fix reshuffle in `App.tsx`. Store the user's valence/arousal from check-in in
> App state, plus every artwork id shown this session. "Show me different ones"
> re-calls `/api/match` with the same coordinates and all shown ids as
> `exclude_ids`. Skip-path reshuffles call `/api/default-set` the same way.
> No limit on reshuffles. If the pool is exhausted, handle it warmly rather than
> erroring — show me the string you'd use.

---

## Slice 4 — Fix metadata timing

The Info button is currently in the canvas top bar, visible while painting.
PRD F2 says metadata appears only *after* the creative act.

**Prompt:**

> Move the artwork info reveal out of `CanvasScreen` and onto `CloseScreen`.
> Remove the Info button and its drawer from the canvas top bar entirely. On the
> close screen, add a small tappable "i" that calls `/api/artworks/{id}/meta` on
> demand and reveals title, artist, date, and genre. Metadata must not be fetched
> before the user finishes.

---

## Slice 5 — Make the close screen honest

It currently says "Whatever you made lives here, just for you" while saving
nothing.

**Prompt:**

> On leaving the canvas, save the painting as a data URL to localStorage along
> with the artwork id and a timestamp. Keep the close screen copy as is — but it
> must now be true. No account flow, no sync. If localStorage is unavailable or
> full, fail quietly rather than showing an error.

---

## Slice 6 — Tone and copy pass

Do this last, with fresh context.

**Prompt:**

> Read the Design & Tone section of `docs/Digital_Art_Therapy_PRD.md` and the tone
> rules in CLAUDE.md. Audit every user-facing string in `src/app/App.tsx`,
> including new loading and error states.
>
> For each: current text, whether it violates the rules, suggested replacement.
> Flag especially anything presuming to know how the user feels, clinical
> imperatives, and corporate cheer.
>
> Separately, give me your read on the circumplex quadrant labels — "tense",
> "excited", "depressed", "serene". "depressed" in particular is clinically loaded
> and PRD Section 12 rules out clinical framing. Don't change it; tell me the
> tradeoff.
>
> Don't edit code yet — give me the list first.

---

## Working with Claude Code in VS Code

**Per slice:**

1. `/clear` first — stale context makes output worse, not better
2. Shift+Tab twice for plan mode, paste the prompt, read the plan, approve
3. Let it build; review the diff in the source control panel, not in chat
4. Run it yourself before believing it's done
5. `git commit` before moving on

**Helps:** telling it specifically what's wrong instead of re-prompting from
scratch · asking "what are you unsure about?" before approving a plan · pasting a
screenshot when the UI looks off.

**Hurts:** long sessions without `/clear` · two slices at once (diffs get too big
to review honestly) · pasting secrets into chat · accepting a large diff you
haven't read.

**One caution:** `src/app/App.tsx` is a single ~1060-line file holding every
screen. Claude Code may offer to split it into modules. That's reasonable
eventually, but it should be its own slice — not a side effect of a data-wiring
task, where it would bury the real change in a thousand-line diff.
