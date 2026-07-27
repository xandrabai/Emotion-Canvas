# CLAUDE.md

Project context for Claude Code. Read this before making changes.

---

## What this is

A digital art therapy web app for university students. The loop:

1. User taps a point on a 2D circumplex field (valence × arousal) — or skips
2. System surfaces 3–5 public-domain artworks matched to those coordinates
3. User picks one; it loads as an adjustable-opacity background layer
4. User paints over it with a basic toolset
5. Session ends with no score, no analysis, no prompt to reflect

Full spec: the PRD. Note the copy at `src/imports/Digital_Art_Therapy_PRD.md` is
an outdated v1.0 — the current version is v1.3.1. **When in doubt, the PRD wins.**
If you think the PRD is wrong, say so — don't silently deviate.

**Current state:** the UI is fully built (Figma Make export) and runs entirely on
hardcoded mock data. The Python pipeline and the Supabase matching function are
built and working. **They are not connected to each other.** That wiring is the
active work — see `BUILD_PLAN_checkin_loop.md`.

---

## Hard guardrails — never violate these

1. **AI never infers, analyzes, or stores conclusions about the user's emotional
   state.** AI is used offline only, to tag *artwork* attributes. There is no
   runtime model call anywhere in the user path. If a task seems to require
   inferring how the user feels, stop and flag it.

2. **Never show mood commentary.** No "this matches how you feel," no "based on
   your mood," no interpretation of the user's tap, and no framing of the returned
   artworks as reflecting the user's state. (Axis labels on the circumplex field
   itself are a separate, open design question — see Open Questions below. They
   are not covered by this rule.)

3. **Artwork metadata is hidden before and during the creative act.** Title,
   artist, date, and genre are revealed only after painting, via an optional
   tappable "i". Do not include these fields in the match response payload —
   serve them from a separate endpoint called on demand. Withholding them at the
   API layer, not just in the UI, is deliberate.

4. **No auth gate.** The app opens straight to the check-in. Account creation is
   offered only after a user has made something worth saving, never before.

5. **No social anything.** No sharing, feeds, likes, galleries, or export-to-social.

6. **Skip is always available and equally valid.** Every check-in screen has a
   visible skip that leads to a rotating default artwork set.

---

## Tone rules for all user-facing copy

Every string a user can see — buttons, empty states, errors, loading text —
must read as if a warm, emotionally intelligent person wrote it.

- **Avoid:** clinical imperatives ("Select a mood", "Submit", "Session complete"),
  corporate cheer ("Great job!", "You're all set!"), anything survey-shaped.
- **Prefer:** "Whenever you're ready", "Take your time", "Here are a few others".
- **The line not to cross:** warmth describes *the space being offered*, never the
  *user's inner state*. "A quiet space, whenever you need it" — yes.
  "I know today's been hard" — no.
- This holds in error and empty states too. A single cold string breaks it.

If you write a user-facing string, flag it in your summary so it can be reviewed.

---

## Stack

- **Frontend (built):** React 18 + TypeScript + Vite. Tailwind + shadcn/ui
  (Radix) + MUI, `motion/react` for animation, `lucide-react` for icons.
  Originally a Figma Make export. Entry: `src/main.tsx` → `src/app/App.tsx`.
  Run with `npm i && npm run dev`.
- **Backend (to build):** FastAPI (Python), thin. Wraps the existing Supabase
  RPC. No ORM, no business logic beyond input validation and response shaping.
- **DB:** Supabase (Postgres). Matching is a Postgres function using the `point`
  type with a GiST index and the `<->` KNN operator
  (`match_paintings_function.sql`).
- **Existing Python:** `compute_valence_arousal.py`, `backfill_aic_metadata.py`,
  `matching.py` — offline pipeline plus the matching wrapper. `matching.py`
  already exposes `get_initial_matches(valence, arousal, match_count)` and
  `reshuffle_matches(valence, arousal, shown_ids, match_count)`. **Do not rewrite
  these. The backend should import and call them.**

---

## Repo layout

Current (Figma Make export + loose Python at root):

```
src/
  main.tsx
  app/App.tsx              all five screens live here (~1060 lines)
  app/components/ui/       shadcn primitives — do not hand-edit
  app/components/figma/
  styles/                  theme.css, tailwind.css, globals.css, fonts.css
  imports/                 stale v1.0 PRD copy
matching.py                Supabase RPC wrapper — import this, don't rewrite
compute_valence_arousal.py
backfill_aic_metadata.py
guidelines/Guidelines.md
```

Target additions:

```
api/
  main.py        FastAPI entrypoint + CORS for the Vite dev origin
  routes.py      HTTP endpoints only — no logic
  config.py      env loading, settings
docs/
  Digital_Art_Therapy_PRD.md      current v1.3.1
  match_paintings_function.sql    move in from Downloads
scripts/
  inspect_scores.py
src/lib/api.ts   typed client for the three endpoints
.env             gitignored
```

`App.tsx` is one ~1060-line file holding every screen. Don't refactor it into
modules as a side effect of another task — if it should be split, that's its own
slice, proposed separately.

---

## Things to verify, not assume

These are unknown to anyone reading this file cold. **Check the actual code and
database before writing anything that depends on them — do not guess.**

- The numeric range of `valence_score` and `arousal_score` (0–1? −1..1? 0–100?)
- The exact signature and return shape of the `match_paintings()` SQL function
- The exact signature of `matching.py`'s wrapper functions
- The real table name and column list
- How `shown_ids` / exclusion is currently expressed

If a value isn't verifiable from the repo, ask rather than inventing a plausible one.

---

## Conventions

- **Secrets:** Supabase URL and keys come from `.env` via `config.py`. Never
  hardcode, never echo a key into chat or logs. `.env` stays gitignored.
- **Service-role key stays server-side.** It must never reach the browser.
- **Commits:** one logical slice per commit, imperative subject line.
- **Errors:** the API may return technical detail; the UI must translate it into
  the tone above. Never surface a raw stack trace or status code to the user.
- **Dependencies:** ask before adding one. The bias is strongly toward fewer.

---

## IIIF images

Artwork images come from the Art Institute of Chicago IIIF endpoint:

```
https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg
```

Only rows where `image_id IS NOT NULL` are servable. (A previous bug used a
non-existent AIC field `is_has_image` — that field does not exist. Filter on
`image_id IS NOT NULL`.)

---

## How I like to work

- Propose a plan before writing code for anything non-trivial. I'll approve it.
- Build in small vertical slices that each run and are demoable.
- Prefer boring, readable code over clever code. This is an MVP and a portfolio
  piece; someone will read it.
- Tell me when you're uncertain instead of picking a plausible-looking default.

---

## Known gaps between the built UI and the PRD

These are the active work items. Don't "fix" them opportunistically inside an
unrelated task — each has its own slice in `BUILD_PLAN_checkin_loop.md`.

1. **`ARTWORKS` in `App.tsx` is fabricated mock data.** Eight entries using
   Unsplash stock photographs with invented titles attributed to real painters
   (Cassatt, Manet, Constable). Not AIC, not public-domain art, not IIIF. Must be
   replaced wholesale with live data — not extended or partially patched.
2. **`getMatchedArtworks()` is a client-side mock** of the real matching function.
   Delete it once the API is wired; do not keep it as a fallback.
3. **Reshuffle discards the check-in.** `onShuffle` calls `getRandomArtworks()`,
   losing the valence/arousal coordinates and passing no exclusions, so artworks
   can repeat. PRD C3 requires reshuffling *within the same matched pool* with
   previously-shown ids excluded. `matching.py::reshuffle_matches` already does
   this correctly.
4. **Metadata is exposed during painting.** The Info button is in the canvas top
   bar, and the `Artwork` type carries title/artist/year/medium into the client
   from the start. PRD F2 requires metadata only *after* the creative act.
5. **The close screen promises persistence that doesn't exist.** "Whatever you
   made lives here, just for you" — nothing is saved anywhere.

---

## Open questions — flag, don't decide unilaterally

- **Circumplex axis and quadrant labels.** The field currently shows axis labels
  ("positive / pleasant", "active / arousal") and quadrant labels ("tense",
  "excited", "depressed", "serene"). Labels aid comprehension, but "depressed" is
  a clinically loaded term and PRD Section 12 rules out clinical framing. Raise
  this rather than deciding it.
- **Tap-to-score mapping.** `CheckInScreen` maps taps to −1..1 via
  `pos.x * 2 - 1` and `-(pos.y * 2 - 1)`. Whether that matches the range and
  distribution of the real `valence_score` / `arousal_score` columns is
  unverified — see Slice 0.

---

## Setup that must exist before feature work

- **Git is not initialized.** Do this first; without it there's no diff review
  and no way to revert.
- **No `.env` file.** `matching.py` reads `SUPABASE_URL` and `SUPABASE_KEY` at
  import time and will raise `KeyError` on import until one exists.
- **`match_paintings_function.sql` lives outside the repo** (in `~/Downloads`).
  Move it into `docs/`.
