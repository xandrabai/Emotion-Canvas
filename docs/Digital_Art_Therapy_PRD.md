# Product Requirements Document

## Digital Art Therapy for University Students

**Document status:** Draft v1.3.1 **Owner:** [Your name] **Last updated:** July 26, 2026

## 1. Executive Summary

This product is a lightweight, private, non-verbal creative outlet designed for university students (undergraduate, master's, and PhD) who regularly experience isolating, hard-to-articulate negative emotions. Rather than asking users to name or explain their feelings, the product uses a psychologically-grounded, low-friction check-in to surface curated public-domain artworks (sourced from the Art Institute of Chicago's open API), which users can then paint over using an adjustable-opacity background layer and a full digital painting toolset.

The core differentiator: **the system interprets artwork, never the user's emotional state.** Every design decision traces back to this principle.

## 2. Problem Statement

University students regularly experience isolating, hard-to-name negative emotions — most often late at night or during unstructured, solitary stretches of academic work — and lack a private, low-effort way to process these feelings when they can't or don't want to put them into words.

Existing solutions fail this population in specific ways:

- **Journaling apps** require verbal articulation, which is the exact barrier this segment faces

- **Meditation apps** (Calm, Headspace) are passive and generic, not expressive or externalizing

- **Counseling services** feel like "too big a step" for everyday, low-grade distress

- **Social media** often worsens the underlying isolation/comparison spiral rather than relieving it

## 3. Target Users & Segmentation

**Primary segment:** University students — undergraduate, master's, and PhD — unified not by demographic stage but by a shared underlying **Job to Be Done**:

"When I feel isolated or emotionally 'off' and can't explain why, I want a private, low-stakes way to process it, so I don't feel so alone with it."

Undergraduates and graduate students were evaluated as separate segments but combined once validated: their *triggers* differ (social difficulty vs. structural/research isolation), but their *core need* — privacy, non-verbal expression, no requirement to justify the feeling — is the same.

**Access note:** Segment chosen partly because the author has direct access to this population for interviews and validation (personal project constraint).

## 4. Pain Points

### Root emotional pain points

- Feeling isolated but reluctant to burden friends/family with it

- No private outlet that doesn't require articulating feelings in words

- Existing wellness apps feel passive or generic

- Talking to a counselor feels reserved for "a real crisis," not everyday stress

### Root causes of negative emotion

- **Social:** no close friends, isolation despite acquaintances, friend group conflict, breakups, roommate conflict, comparison with peers

- **Academic:** exam stress, thesis/dissertation pressure, falling behind, imposter syndrome, fear of failure, no one to turn to when stuck

- **Identity/life-stage:** homesickness, culture shock, financial stress, uncertainty about the future, loss of old identity/routine

- **Physical/logistical:** burnout, sleep deprivation, over/understimulation

- **Existential/emotional regulation:** generalized anxiety with no clear cause, grief, perfectionism/self-criticism

### Timing/context triggers

- Late at night, unable to sleep

- Before/after high-stakes academic events

- Sunday scaries

- Weekends/breaks when campus empties out

- After a triggering social moment

- Transition points (semester start, finals, holidays)

- Long unstructured research/writing stretches

- While scrolling social media

- Upon waking, facing dread about the day

### Current coping mechanisms (and their gaps)

| **Current behavior** | **Gap** |
| --- | --- |
| Calling family/hometown friends | Doesn't address immediate on-campus isolation |
| Scrolling social media | Often worsens comparison spiral |
| Meditation apps | Passive, doesn't allow externalization |
| Journaling apps | Requires words the user may not have |
| Campus counseling | Long wait times, feels too high-stakes for daily use |
| Avoidance/numbing (games, Netflix) | Doesn't process the feeling, just delays it |

## 5. Prioritized Core Use Cases

Use cases were scored on **frequency, intensity, and gap in current solutions**. The following converged as the highest-priority cluster — all are frequent, isolating, and hard to describe in words:

| **#** | **Use Case** | **Trigger Pattern** |
| --- | --- | --- |
| UC1 | Late-night rumination / can't sleep | Alone, racing thoughts, no one to talk to |
| UC2 | Thesis/research isolation | Long solitary work stretches, vague heavy feeling |
| UC3 | Comparison spiral (social media) | Passive scrolling triggers inadequacy |
| UC4 | Emotional numbness / "just feeling off" | No identifiable cause |
| UC5 | Feeling like a burden | Reluctance to reach out to others |
| UC6 | Imposter syndrome | Contradicts outward success, hard to voice |
| UC7 | Post-achievement emptiness | Counterintuitive flatness after a milestone |

**Cross-cutting insight:** all seven share a common signature — *alone, at a low point, no one immediately available, and no clear way to name what's happening.* This convergence defines the product's actual scope.

## 6. Solution Design Principles

Every feature must satisfy these four principles, derived directly from the use cases above:

- **Low-friction / instant availability** — no login or setup barrier at the moment of need

- **Non-verbal expression** — art-making replaces language entirely

- **Reflective closure** — sessions end with a sense of release, not analysis or scoring

- **Reason-agnostic** — works with no need to name an emotion or justify a cause

**Guardrail principle:** AI is used only to understand and organize artwork (color, texture, energy). **AI is never used to infer or analyze the user's emotional state.** This is a hard boundary, not a soft preference.

## 7. Design & Tone Requirements

These requirements govern the visual and verbal design of the product. They exist because the product's therapeutic value depends as much on *how it feels to use* as on *what it does* — a technically correct feature set delivered in a cold, clinical, or generic tone would undermine the core principles in Section 6.

### 7.1 Visual design

- **Color palette:** Soothing, low-saturation tones (soft neutrals, muted blues/greens/warm earth tones) rather than bright, high-energy, or "gamified" colors. Avoid harsh contrast or alert-style colors (e.g., aggressive reds) except where accessibility requires it.

- **Typography:** Warm, rounded, legible typefaces — avoid clinical/institutional-feeling fonts (e.g., sterile system sans-serifs used in medical or enterprise software) and avoid overly playful/childish fonts that could undercut the product's credibility for a stressed adult user.

- **Layout:** Generous whitespace, minimal visual clutter, soft edges/rounded corners on UI elements to reinforce a feeling of safety rather than efficiency or urgency.

- **Motion:** Transitions should be slow and gentle (no abrupt cuts, no jarring loading spinners) — pacing itself communicates "there is no rush here."

### 7.2 Voice & tone (writing all in-app text)

- **Goal:** Every piece of copy — buttons, prompts, empty states, error messages — should read as if a warm, emotionally intelligent person wrote it, not as system-generated or clinical text.

- **Avoid:** Imperative/clinical phrasing ("Select a mood," "Submit," "Session complete"), corporate cheerfulness ("Great job!", "You're all set!"), and anything that resembles a form or survey.

- **Prefer:** Gentle, conversational phrasing that acknowledges the user without presuming to know their state (e.g., "Whenever you're ready" instead of "Begin," "Take your time" instead of "Session in progress").

- **Consistency:** This tone must hold even in edge cases — error states, empty states (e.g., no artworks matched), and account-creation prompts — since a cold or generic tone in just one moment can break the sense of being "heard" that the rest of the product builds.

- **Guardrail:** Warmth in tone must never cross into presuming to know how the user feels (this would violate the reason-agnostic principle in Section 6). Warm phrasing describes the *experience being offered*, not the *user's inner state* — e.g., "A quiet space, whenever you need it" rather than "I know you're feeling anxious, let's fix that."

### 7.3 Design requirements backlog additions

| **ID** | **Requirement** | **Priority** |
| --- | --- | --- |
| DR1 | Define and apply a soothing color palette (low-saturation, muted tones) across all screens | P0 |
| DR2 | Select warm, legible typography distinct from clinical/system defaults | P0 |
| DR3 | Write all in-app copy (buttons, prompts, empty/error states) in a warm, human, conversational voice | P0 |
| DR4 | Apply slow, gentle motion/transition design throughout | P1 |
| DR5 | Tone/copy review pass specifically checking for accidental clinical phrasing or presumption of user emotion | P0 |

## 8. User Stories & Acceptance Criteria

### US1 — Late-night rumination

**As a** student lying awake at night with racing thoughts, **I want** to start processing my feelings right away, **so that** I can calm down and fall asleep more easily.

- User can begin engaging with the feeling without first explaining or categorizing it

- User does not need to formulate thoughts into words to participate

- User reports feeling calmer after the activity than before

- User reaches a natural stopping point without needing to decide when they're "done"

### US2 — Thesis/research isolation

**As a** grad/PhD student in a solitary work stretch, **I want** to release a vague, heavy feeling without naming it precisely, **so that** I can return to work with a clearer head.

- User can engage with the feeling without identifying a specific emotion or cause

- The activity accommodates both brief and extended engagement

- User experiences a sense of completion without needing to interpret the outcome

### US3 — Comparison spiral

**As a** student starting to feel inadequate while scrolling social media, **I want** to redirect my attention away from comparison, **so that** I can interrupt the spiral instead of feeling worse.

- User shifts from passive comparison into active engagement with their own experience

- User's attention becomes focused on their own creative act, not on others

- User does not encounter other users' content or achievements during the activity

### US4 — Emotional numbness

**As a** student who feels flat or unmotivated without a specific cause, **I want** to process the feeling without explaining why, **so that** I can still work through it without a clear reason.

- User can begin and complete the activity without identifying a cause or category

- User feels no pressure to justify the feeling before engaging

- "I don't know why I feel this way" is treated as a sufficient starting point

### US5 — Feeling like a burden

**As a** student who doesn't want to burden others with how I feel, **I want** a private way to process emotions, **so that** I don't have to worry about being "too much" for someone else.

- User can process feelings without involving or notifying another person

- User feels no expectation or pressure to share their experience

- User trusts their engagement remains private unless they actively choose otherwise

### US6 — Imposter syndrome

**As a** student who feels like they don't belong despite outward success, **I want** to express a contradictory feeling without forming a coherent explanation, **so that** I don't have to make sense of something that doesn't feel logical.

- User can express the feeling without organizing it into a narrative

- User is not asked to explain or justify the contradiction

- User feels the expression reflects their internal state, even without words

### US7 — Post-achievement emptiness

**As a** student who feels empty instead of relieved after a big achievement, **I want** to acknowledge that feeling without explaining why it doesn't match expectations, **so that** I don't feel like something is wrong with me.

- User can acknowledge the feeling as valid without matching an "expected" emotional response

- User does not encounter messaging implying they should feel differently

- User leaves the activity feeling accepted rather than judged

## 9. Solution Workflow (End-to-End)

1. OPEN APP

   No login required. Entry must be near-instant.

2. OPTIONAL CHECK-IN

   MVP (Phase 1): User sees a 2D tappable field (arousal x valence,

   per the Circumplex Model of Affect). Tapping is entirely optional;

   "skip" is always visible and equally valid.

   - If tapped: captures arousal/valence coordinates

   - If skipped: system falls back to a rotating curated default set

   Phase 2 (not MVP): After the circumplex field, offer an optional

   secondary color/temperature metaphor prompt (e.g., "what color/

   temperature feels closest to right now") for users who want a

   second, lighter-touch way to refine their check-in. This is

   deliberately excluded from Phase 1 to keep the check-in to a single

   step and avoid adding friction before the mechanism is validated.

3. ARTWORK MATCHING

   System filters a pre-tagged, public-domain artwork dataset

   using arousal/valence (or defaults) and presents 3-5 options.

   No mood commentary is ever shown ("this matches how you feel").

   User may tap "show me different ones" to reshuffle within the

   same matched pool, with no limit.

4. ARTWORK SELECTION

   User taps whichever image resonates. No explanation requested.

5. CREATIVE ENGAGEMENT

   Selected artwork loads as an adjustable-opacity background layer

   (default ~50-60%). Full painting toolset (brush, color, size,

   blending) is available on a layer above it. Users can raise or

   lower opacity freely, suiting any skill level from beginner

   (trace/riff closely) to advanced (fade to near-zero, paint freely).

   No minimum duration, no forced "finish" moment.

6. SESSION CLOSE

   Session ends naturally. No score, no mandatory reflection, no

   judgment on the output. Tone stays neutral throughout (no toxic

   positivity). An optional, skippable second check-in may be offered

   for the user's own private awareness — never shown back to them

   as a score or analysis.

7. SAVE / METADATA

   Creation is saved privately by default. No sharing prompt, no

   social feed, ever, as part of the core loop.

   Optional, tappable "i" icon reveals artwork title, artist,

   date, and genre -- available only after the creative act, never

   before or during, to avoid performance pressure or intimidation.

8. OPTIONAL ACCOUNT

   Account creation is deferred and fully optional. Offered only

   after a user has created something worth saving ("Want to save

   this? Create a quick account"), never as a gate before first use.

## 10. Technical Approach: Artwork Data Pipeline

**Data source:** Art Institute of Chicago (AIC) open API, filtered to is_public_domain = true and image_id IS NOT NULL.

**Important scoping note:** The AIC API does not provide any psychological or emotional metadata (no valence_score, arousal_score, or equivalent). These scores must be *derived* by this product's own pipeline from raw artwork data (primarily the image itself). AIC metadata is used only for filtering the curated subset, display, and attribution — never as a source of emotional data.

### 10.1 Valence/Arousal Scoring Method — Phase 1 (MVP)

**Method:** Valdez & Mehrabian (1994) linear color-emotion formula. This method derives valence and arousal directly from brightness and saturation, using published regression coefficients from color-emotion psychology research. No model training or labeled dataset is required.

**Formula:**

- valence_score ≈ 0.69 × brightness + 0.22 × saturation

- arousal_score ≈ −0.31 × brightness + 0.60 × saturation

(Brightness and saturation normalized to a 0–1 scale before applying the formula.)

**Scope note:** MVP is scoped specifically to realizing the valence/arousal scoring method. energy_tag/texture_tag (vision-model tagging) are deferred to Phase 2 (see Section 10.3) — they are secondary filtering/variety signals, not required for the core check-in → matching loop to function, and their cost (a full vision-model tagging step, tag-vocabulary design, validation) wasn't justified against their effect (redundant with arousal for energy; a nice-to-have diversity signal for texture) at MVP scope.

**Offline batch pipeline (run once / periodically, not at request time):**

- Pull a curated subset of artworks (a few hundred to ~1,000 — not the full archive) filtered by classification_title = "Painting" and a reasonable spread of style_titles

- For each artwork: fetch image via IIIF using image_id

- Extract dominant colors, brightness, and saturation using classic color-clustering (no ML required); AIC's own color field (h/s/l + population) may be used as a supplementary or cross-check signal

- Apply the Valdez & Mehrabian formula to brightness/saturation to compute valence_score and arousal_score per artwork

- Store enriched records in a local database: {id, title, artist_display, image_id, style_titles, subject_titles, dominant_colors, brightness, saturation, valence_score, arousal_score}

**AIC fields required for this method:**

| **Field** | **Purpose** |
| --- | --- |
| id | Unique identifier |
| title, artist_display, date_display | Display metadata (post-session "i" icon) |
| image_id | Fetch image via IIIF for color extraction |
| is_public_domain, image_id | Filtering to eligible artworks (image_id must be non-null) |
| classification_title, style_titles, subject_titles | Curated subset filtering, variety/diversity checks |
| color (h, s, l, population) | Optional supplementary/cross-check signal alongside self-computed brightness/saturation |

Note: brightness, saturation, valence_score, and arousal_score are **not** AIC fields — they are computed by this pipeline and added to the local enriched dataset only.

### 10.2 Valence/Arousal Scoring Method — Phase 2 (Stretch Goal)

**Method:** Apply an existing pretrained deep learning valence/arousal model (trained on a labeled affective-image dataset such as IAPS, OASIS, or NAPS) directly to each artwork image, replacing the Phase 1 linear formula if a suitable pretrained model is found and its accuracy on fine-art paintings is validated.

**Status:** Contingent — dependent on finding a usable, appropriately licensed pretrained model with acceptable accuracy on paintings (these datasets/models are usually trained on photographs, not fine art, so this is an open validation risk, not a guaranteed upgrade). The hand-engineered feature method (Machajdik & Hanbury, 2010) was evaluated and intentionally **skipped** in favor of going straight to a pretrained model if one is found, since it does not offer the earlier method's "no ML infra" simplicity nor the later method's "no feature engineering" simplicity.

**Pipeline (if pursued):**

- Source or license a pretrained valence/arousal image model

- For each artwork: fetch image via IIIF using image_id (same as Phase 1 — no new AIC fields required)

- Run the image directly through the pretrained model to obtain valence_score and arousal_score

- Validate outputs against a small human-rated sample (e.g., 20–30 curated artworks rated informally) before trusting scores across the full dataset

- Replace or A/B test against the Phase 1 formula-based scores in the enriched dataset

**AIC fields required for this method:**

| **Field** | **Purpose** |
| --- | --- |
| id | Unique identifier |
| image_id | Fetch raw image for the pretrained model — this is the *only* input the model needs |
| is_public_domain, image_id | Filtering to eligible artworks (image_id must be non-null) |

Note: unlike Phase 1, this method needs no color/style/subject metadata to compute the score itself — the pretrained model works directly on pixels. style_titles/subject_titles/classification_title are still pulled for curated-subset filtering and display, but play no role in the scoring calculation.

### 10.3 Energy/Texture Tagging — Deferred to Phase 2

**Method:** One-time vision-model tagging pass to assign each artwork an energy_tag (calm/energetic) and texture_tag (smooth/sharp, sparse/dense) against a fixed small vocabulary.

**Why deferred:** These tags were evaluated against MVP scope (realizing the valence/arousal scoring method) and cut for two reasons:

- energy_tag is largely redundant with arousal_score, which already places each artwork on a calm↔energetic axis numerically — the tag would mostly be a coarser relabeling of data already produced in Section 10.1.

- texture_tag does capture something valence/arousal doesn't (visual density/complexity, relevant to how a user experiences painting over the background layer), but requires a full vision-model tagging step, tag-vocabulary definition, and validation — cost not justified until the core matching loop is validated with users.

**If pursued in Phase 2:**

- Define a fixed tag vocabulary for both energy_tag and texture_tag

- Run each artwork's image through a vision model (or vision-capable LLM) to assign both tags

- Store energy_tag/texture_tag on the existing enriched record

- Use both as secondary reshuffle/diversity signals in Epic C's matching logic (not as a replacement for valence/arousal matching)

**AIC fields required for this method:** none beyond image_id (same as Phase 1/10.2) — this is a pure vision-model-on-image step with no AIC metadata dependency.

**Runtime (user-facing app, all phases):**

- User's check-in (or default) queries the *local enriched dataset* only — no live AI calls, no live API calls

- Fast, cheap, and fully decoupled from the Art Institute API at request time

**Hard boundary:** AI is used exclusively to describe artwork attributes (color, texture, energy, valence/arousal position). It is never used to interpret, infer, or store conclusions about the user's own emotional state.

## 11. Product Backlog — Phase 1 (MVP)

Backlog is organized into epics, with features prioritized as **P0 (must-have for MVP)**, **P1 (important, near-term follow-up)**, or **P2 (future/stretch)**.

### Epic A: Entry & Check-In

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| A1 | App opens directly to check-in/entry screen, no login required | P0 |
| A2 | Circumplex 2D tappable field (arousal x valence) | P0 |
| A3 | Visible, always-available "skip" option on check-in | P0 |
| A4 | Default rotating artwork set for skipped check-ins | P0 |
| A5 | Color/temperature metaphor prompt as an optional secondary check-in step, shown after the circumplex field | P2 (Phase 2) |

### Epic H: Design & Tone

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| H1 | Soothing, low-saturation color palette applied across all screens | P0 |
| H2 | Warm, legible typography, distinct from clinical/system defaults | P0 |
| H3 | Full in-app copy written in warm, human, conversational voice | P0 |
| H4 | Slow, gentle motion/transition design | P1 |
| H5 | Copy review pass for accidental clinical phrasing or presumption of user emotion | P0 |

### Epic B: Artwork Data Pipeline

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| B1 | Pull and filter public-domain subset from Art Institute API | P0 |
| B2 | Dominant color / brightness / saturation extraction | P0 |
| B3 | Vision-model batch tagging for energy/texture attributes | P2 (Phase 2 — deferred, Section 10.3) |
| B4 | Local enriched dataset storage (DB) | P0 |
| B5 | Periodic refresh/expansion of tagged subset | P2 |
| B6 | Compute valence_score/arousal_score via Valdez & Mehrabian linear formula (Phase 1 method) | P0 |
| B7 | Source/validate a pretrained valence-arousal image model, if one exists with acceptable painting accuracy (Phase 2 method) | P2 |
| B8 | Replace/A-B test Phase 1 formula scores against Phase 2 pretrained-model scores | P2 |

### Epic C: Artwork Matching & Selection

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| C1 | Query enriched dataset by arousal/valence match | P0 |
| C2 | Present curated set of 3-5 artworks, no mood commentary | P0 |
| C3 | "Show me different ones" reshuffle within same matched pool | P0 |
| C4 | User taps to select one artwork | P0 |

### Epic D: Creative Engagement (Painting)

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| D1 | Artwork loads as background layer with opacity slider | P0 |
| D2 | Core painting toolset: brush, color picker, size, eraser | P0 |
| D3 | Default opacity setting (~50-60%), user-adjustable | P0 |
| D4 | Blending/layering tools | P1 |
| D5 | Undo/redo | P0 |
| D6 | No forced session duration or "finish" prompt | P0 |

### Epic E: Session Close & Privacy

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| E1 | Natural session end, no score or mandatory reflection | P0 |
| E2 | Neutral, non-judgmental copy throughout (no toxic positivity) | P0 |
| E3 | Optional, skippable second check-in (private, not shown as analysis) | P1 |
| E4 | Private-by-default storage of creations | P0 |
| E5 | No sharing/social feed in core loop | P0 |

### Epic F: Artwork Metadata & Context

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| F1 | Optional tappable "i" icon post-session: title, artist, date, genre | P1 |
| F2 | Metadata hidden by default before/during creative act | P0 |

### Epic G: Optional Account & History

| **ID** | **Feature** | **Priority** |
| --- | --- | --- |
| G1 | Deferred, optional account creation (offered after first creation) | P0 |
| G2 | Opt-in saving of past paintings and check-in choices | P0 |
| G3 | Private history/timeline view of past sessions | P1 |
| G4 | Cross-device sync for saved account data | P2 |

## 12. Out of Scope for Phase 1

- Any clinical framing, diagnosis, or efficacy claims ("treats anxiety," "heals trauma")

- Social sharing, feeds, likes, or public galleries

- AI-based inference of user emotional state (hard boundary, not just deprioritized)

- Full Art Institute archive processing (100,000+ objects) — curated subset only

- Advanced generative mechanics (style transfer, AI-assisted painting) — potential Phase 2 exploration

- Color/temperature metaphor as a secondary check-in step (Section 9, Step 2) — deferred to Phase 2 to keep the MVP check-in to a single, validated mechanism

- Vision-model tagging for energy_tag/texture_tag (Section 10.3) — deferred to Phase 2; not required for the core valence/arousal check-in → matching loop

## 13. Open Questions / Risks

| **Question** | **Why it matters** |
| --- | --- |
| What is the right default opacity, and should it adapt over time per user? | Affects "blank canvas anxiety" vs. over-reliance on the artwork |
| Should the optional second check-in ever surface a subtle before/after signal to the user, or stay fully silent? | Risk of drifting toward "analysis," which conflicts with core principles |
| How large does the curated, tagged artwork subset need to be to avoid repetition? | Affects perceived variety and long-term engagement |
| Should there be any safety-net messaging (e.g., quiet, non-intrusive link to campus counseling resources) for users in visible distress? | Worth considering even in a non-clinical wellness product, as a responsible design practice |
| Does adding the Phase 2 color/temperature prompt after the circumplex field actually improve match quality, or does it just add friction? | Should be validated with real usage data from Phase 1 before committing to building it |
| Does a pretrained valence/arousal model exist with acceptable accuracy on fine-art paintings (vs. the photographs most such models are trained on)? | Determines whether Phase 2 scoring upgrade (Section 10.2) is viable, or whether the Phase 1 linear formula remains the long-term method |

## 14. Success Metrics (for future validation)

- Session completion rate (started vs. reached natural close)

- Return usage rate (weekly active use, especially late-night sessions)

- Self-reported calm/settled feeling (optional, private, never shown as a score to avoid contradicting core principles — could be measured via periodic anonymous survey rather than in-app scoring)

- Skip rate on check-in (signal of whether the check-in itself feels like a burden)

- Reshuffle frequency (signal of whether artwork matching quality needs improvement)