# Action Plan — Get Real Artwork Into the UI

The UI is built. The data pipeline is built. They're not connected. That's the
whole job.

Right now `App.tsx` runs on 8 hardcoded fake artworks (Unsplash photos with made-up
titles). Goal: tap the check-in field, see real Art Institute paintings.

**Three slices. Roughly a day.**

---

## Setup — 5 minutes, do it yourself

```bash
cd "~/Downloads/Frontend design for product"

git init
printf '.env\nnode_modules/\n.venv/\n.DS_Store\ndist/\n' > .gitignore
git add -A && git commit -m "Initial commit"

cat > .env <<'EOF'
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-service-role-key
EOF
# fill in real values
```

`matching.py` reads those two env vars **at import time**, so without `.env` it
crashes on import and the error won't point at the real cause. Git matters because
you're about to let an agent edit a 1000-line file.

---

## Slice 1 — Backend

**Prompt for Claude Code:**

> Read `matching.py` for the exact function signatures and return shape.
>
> Create a minimal FastAPI backend in `api/`:
> - loads SUPABASE_URL and SUPABASE_KEY from `.env`
> - CORS allowing http://localhost:5173 (Vite dev server)
> - `POST /api/match` — body `{valence, arousal, exclude_ids: list = []}`. Calls
>   `get_initial_matches` or `reshuffle_matches` from `matching.py` depending on
>   whether exclude_ids is empty. Returns the artworks with an `image_url` field
>   built from the AIC IIIF pattern in CLAUDE.md.
> - `POST /api/default-set` — body `{exclude_ids: list = []}`. Random artworks for
>   the skip path. Same response shape.
>
> Import `matching.py`, don't rewrite it. Add `requirements.txt`. Tell me how to
> run the server.

**Done when:** you curl `/api/match` and the image URLs load in a browser.

---

## Slice 2 — Point the UI at it

**Prompt for Claude Code:**

> In `src/app/App.tsx`, replace the mock data with real API calls.
>
> - Add `src/lib/api.ts` with functions for both endpoints, base URL from `VITE_API_URL`
> - Delete `ARTWORKS`, `getMatchedArtworks()`, and `getRandomArtworks()` entirely —
>   no fallbacks
> - `handleCheckIn` calls `/api/match`, `handleSkip` calls `/api/default-set`
>
> Also fix reshuffle while you're in here. Right now `onShuffle` calls
> `getRandomArtworks()`, which throws away the check-in coordinates and passes no
> exclusions, so artworks repeat. Instead: keep the user's valence/arousal in App
> state along with every artwork id shown this session, and have "show me different
> ones" re-call the same endpoint with those coords and all shown ids as
> `exclude_ids`. Skip-path reshuffles hit `/api/default-set` the same way. No limit
> on reshuffles; if the pool runs out, handle it warmly rather than erroring.
>
> - Add loading and error states. Keep the copy warm and non-clinical per CLAUDE.md —
>   list any strings you write so I can check them
>
> Don't touch the visual design, layout, or animation.

**Done when:** you tap the field, real paintings appear, and reshuffle gives you
different ones without losing your check-in.

---

## Slice 3 — Save the painting

The close screen already says "whatever you made lives here, just for you" — right
now that isn't true.

**Prompt for Claude Code:**

> When the user leaves the canvas, save the painting to localStorage as a data URL,
> along with the artwork id and a timestamp. Keep the existing close screen copy —
> it just needs to be true now. No account flow, no sync. If localStorage is
> full or unavailable, fail quietly rather than showing an error.

**Done when:** the copy on the close screen isn't a lie.

**That's the MVP.** Stop here and use it.

---

## Worth 10 minutes at some point

Your valence and arousal scores both come from brightness and saturation, so they
may be measuring nearly the same thing. If so, two opposite corners of the check-in
field are empty and taps there always return the same handful of paintings.

You'll probably notice this just by using it — if tapping opposite corners gives
suspiciously similar art, that's the cause. To check directly:

> Write `scripts/inspect_scores.py` that pulls all valence and arousal scores from
> Supabase and prints the Pearson correlation between them, the min/max of each,
> and saves a scatter plot.

If r is above ~0.7, the fix isn't complicated: either live with it for MVP, or add
edge density as a second input to the arousal score so it stops tracking brightness.

---

## Later — real gaps, none urgent

Do these once the loop works. None get harder for waiting.

- **Artwork info shows during painting.** The Info button is in the canvas top bar;
  PRD F2 says metadata comes only after. Move it to the close screen.
- **Quadrant label "depressed"** is clinically loaded, and PRD Section 12 rules out
  clinical framing. Worth a rethink.
- **Tone pass** over all copy including new loading and error states.

---

## Using Claude Code

`/clear` between slices. Shift+Tab twice for plan mode on anything non-trivial.
Review the diff in the source control panel, run it yourself, commit before moving on.

`App.tsx` is one ~1060-line file with every screen in it. If Claude Code offers to
split it up, say not now — you don't want that diff mixed into a data-wiring change.
