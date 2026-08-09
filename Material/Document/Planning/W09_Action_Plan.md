# T06 — Action Plan (Week 09)

## Overview

Week 09 is the final week before the seminar. It compresses the S3 finish
(originally scoped across Weeks 07–08) with the entire S4 build (User Guide,
screencast, activity worksheet, slides) into a single week, ending in the **S5
pre-share** — a hard external deadline three working days before S6.

This plan is deliberately organized **by kind of work** rather than by day. The
week has ~4 working days to S5 pre-share and ~9 working days to S6; sequencing
by day would either misrepresent slack that isn't there or lock the order
prematurely. Grouping by kind lets independent tracks run in parallel and lets
scope be cut per-track if a track slips, rather than dropping a whole day's
list.

**Scope stance.** Full scope kept — nothing pre-cut. Apidog AI (M4) is
intentionally started one day late to let the hosted-LLM decision settle
overnight; every other track begins immediately. Cuts are only pulled from the
**§ Cut order** list at the bottom if a track visibly slips, and are pulled
smallest-first.

## Where the stages land on the calendar

| Semester week     | Report label       | Stage state                                                                  |
| ----------------- | ------------------ | ---------------------------------------------------------------------------- |
| Week 07           | Report Week 04     | S3 partial — spec, defect catalogue, Pact/M6 done                            |
| Week 08           | Report Week 05     | S3 finish carried — M2, M3-Apidog, M4, M5, User Guide skeleton all unshipped |
| **Week 09 (now)** | **Report Week 06** | **S3 finish + S4 finish → S5 pre-share (hard, end of week)**                 |
| Week 10           | Report Week 07     | S6 live seminar + S7 audience feedback; S8 reflection within 2 working days  |
| Week 11           | Report Week 08     | Buffer + S8 audit pack submission                                            |

**Schedule reality.** All prior slack is spent. Week 09 is the last week that
can absorb any slip before the graded event. The S5 pre-share is not negotiable
— audience teams need three working days with the pre-share materials to run
S6's activity properly.

## S3 milestones — status entering Week 09

| Milestone     | Status                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **M1**        | Partial — spec imported, environment + auth configured; "hello world" green request not formally captured |
| **M2**        | Outstanding — four-scenario matrix on `POST /api/cart`, plus Happy Path Purchase flow                     |
| **M3-Apidog** | Partial — FM-01 logged; **2 more failure modes needed** (candidates in `Material/Document/SUT-Reference/EShop_Failure_Modes.md`)          |
| **M3-Pact**   | Done — FM-02 logged                                                                                       |
| **M4**        | Outstanding — hosted-LLM route (local Ollama deferred out of scope for this cycle)                        |
| **M5**        | Outstanding — setup time / run time / flake rate table                                                    |
| **M6**        | Done — 51 Pact interactions across 3 consumers; 46/51 provider baseline, 5 violations documented          |

## Work groups — by kind

Nine tracks. The Baseline track feeds the Screencast and AI Comparison tracks;
everything else can proceed in parallel. Each track lists its exit criterion —
the concrete thing that means "done" for S5.

### Track A — Baseline scenarios (M1 completion + M2)

Feeds: Screencast (needs a passing scenario to record), AI Comparison (needs
hand-built cases to diff against).

- [ ] Confirm M1 as green: one clean request against the running SUT through
      Apidog's collection with a captured response — screenshot to
      `Material/Evidence/M1_hello_world.png`. This is a 15-minute closure item,
      not a work stream.
- [ ] Build the **four-scenario matrix on `POST /api/cart`** following
      `Material/Document/Apidog/EShop_Apidog_Steps.md` Step 6 and 6a:
    - Positive: authenticated add of an in-stock item.
    - Security: unauthenticated add → 401; cross-user cart access.
    - Boundary: quantity 0 / negative / above stock; missing `price`.
    - Negative: non-existent `product_id`; malformed body.
- [ ] Extend outward through `Material/Document/Apidog/EShop_Apidog_TestCases.md`, **prioritising
      endpoints with documented defects** so cases double as defect evidence.
      Order: `PUT /api/users/me` (SEC-06), `GET /api/users/me` (SEC-01),
      `POST /api/checkout` (trust-client-total), `GET /api/products/:id`
      (`{}`-on-404 quirk).
- [ ] Build the **Happy Path Purchase** multi-step scenario (login → products →
      cart → checkout → my-orders) with `Store Variable` processors capturing
      `productId` and `orderId`. Confirm a cold run from an emptied environment
      passes without manual intervention.
- [ ] Export the Apidog project to `Material/Config/` so no work lives only in
      local storage.

**Exit criterion:** the Happy Path scenario runs green from a cold environment
in one click, and the four-scenario matrix on `POST /api/cart` is committed to
the exported project.

### Track B — Apidog AI (M4) — deliberately delayed one day

Blocked-by: hosted-LLM provisioning decision (not local Ollama this cycle).
Feeds: M3-Apidog completion (two of the remaining failure modes are expected to
fall out here), Screencast (needs one live AI feature per S6 requirements), Diff
table (User Guide figure).

- [ ] Provision the hosted-LLM route into Apidog: Organization/Team Settings →
      AI Features → enable → +Add Provider → point at the hosted model. Use the
      reserved $100 Anthropic credit sparingly — this is one of two demo moments
      in S6 that also needs to survive network flakes.
- [ ] Verify with one throwaway generation on `GET /api/categories` before
      committing.
- [ ] For each endpoint already covered by hand-built cases (from Track A),
      **Test Cases → Generate with AI** and save as a separately-named
      collection so the two sets stay comparable.
- [ ] Build the **diff table** — the centrepiece of the seminar pitch:
    - What the AI covered well — schema shape, declared types, status codes.
    - What the AI missed — business rules absent from the spec: coupon reuse,
      ordering beyond stock, cross-user cart access, expired sessions.
    - What the AI got wrong — assertions on non-existent fields, invented
      endpoints, overconfident "valid" cases, auth ignored on protected routes.
    - Coverage against the four-scenario matrix — does the AI generate
      invalid-auth and not-found cases at all?
- [ ] Check the two AI-specific candidates already flagged in
      `Material/Document/SUT-Reference/EShop_Failure_Modes.md`: (a) does the AI generate a "valid" case
      including `role` on `PUT /api/users/me` (SEC-06 as a feature)? (b) does
      Apidog's schema auto-validation pass on `{}`-with-200 from
      `GET /api/products/:id`? Either confirmation becomes a numbered failure
      mode.
- [ ] Screenshot the diff — evidence for M4 and a User Guide figure.

**Exit criterion:** diff table committed to the User Guide; AI collection saved
in the exported Apidog project; both AI-specific failure-mode candidates
resolved (confirmed or ruled out).

### Track C — Metrics (M5)

Feeds: User Guide (quantitative section), S6 pitch (metrics slide).

Piggybacks on Tracks A, B, and the existing Pact runs — no dedicated work
session, but must be captured _while_ those runs happen or the numbers will be
guesses.

- [ ] Setup time: spec import → first green request (Apidog); npm install →
      first passing consumer test (Pact); provider install → first AI generation
      (hosted LLM through Apidog).
- [ ] Run time: full hand-built collection; full AI-generated collection; Pact
      consumer + provider verification.
- [ ] Flake rate: run the full collection **N ≥ 5** times, record
      non-deterministic failures. Expected sources: the in-memory cart, shared
      SQLite state under `NODE_ENV` unset. If N ≥ 5 doesn't fit, drop to N = 3
      and mark the number honestly rather than fake wider runs.
- [ ] Record all three in a single markdown table in the User Guide's Advanced
      Usage section.

**Exit criterion:** single table with three rows (setup, run, flake) × three
columns (Apidog manual, Apidog AI, Pact) committed to the User Guide.

### Track D — Failure modes (M3-Apidog completion)

Feeds: User Guide's Failure Modes section (mandatory — skipping = auto-penalty).

- [ ] Confirm the FM-02 (Pact) entry is complete in `Material/Document/SUT-Reference/EShop_Failure_Modes.md`.
- [ ] Log the two remaining Apidog-side failure modes from Track B's candidates.
      Preserve the six-field structure (what happened / where / why misleading /
      root cause / resolution / lesson) so entries drop straight into the User
      Guide.
- [ ] If Track B's two candidates don't both land, backfill from the other
      already-flagged candidate: "scenario chaining continues silently after a
      failed step in Apidog test scenarios."

**Exit criterion:** `Material/Document/SUT-Reference/EShop_Failure_Modes.md` contains ≥ 3 Apidog entries and ≥ 1
Pact entry, each with the six-field structure filled in.

### Track E — User Guide (S4 core)

The biggest S5 artefact. Skeleton first, then fill from existing docs — most of
this is transcription, not new writing.

- [ ] Create `Material/Deliveries/S5_Pre-Share/User_Guide.md` with the required 7-section
      skeleton: **Introduction, Installation, First Test, Advanced Usage,
      Troubleshooting, Failure Modes, References**. The Failure Modes section is
      required by name; skipping it is an auto-penalty.
- [ ] **Introduction:** what Apidog is, what Pact is, what each answers that the
      other doesn't. Pull from `Material/Document/Pact/EShop_Pact_Plan.md` §Overview.
- [ ] **Installation:** transcribe from `Material/Document/Apidog/EShop_Apidog_Setup.md` (Apidog) and
      `Material/Document/Pact/EShop_Pact_Plan.md` §4 (Pact prerequisite refactors).
- [ ] **First Test:** transcribe from `Material/Document/Apidog/EShop_Apidog_Steps.md` Steps 1–6 (Apidog
      "hello world" through first assertion) and `Material/Document/Pact/EShop_Pact_Plan.md` §5 (one
      consumer test walkthrough).
- [ ] **Advanced Usage:** the four-scenario matrix pattern (Track A), the AI
      diff table (Track B), the metrics table (Track C).
- [ ] **Troubleshooting:** the common gotchas encountered — babel-jest
      `import.meta` handling, `NODE_ENV=test` for `:memory:`, `requestFilter`
      for JWT injection, `MatchersV3.regex` on headers (FM-02).
- [ ] **Failure Modes:** transcribe from `Material/Document/SUT-Reference/EShop_Failure_Modes.md` (all entries).
- [ ] **References:** `EShop_OpenApi.yaml`, `Material/Document/SUT-Reference/EShop_Defect.md`,
      `Material/Document/Pact/EShop_Pact_Plan.md`, Apidog docs, Pact docs.
- [ ] **No AI-generated text goes into the guide unedited** — auto-penalty.

**Exit criterion:** all 7 sections drafted; Failure Modes section present with ≥
4 total entries; ≤ ~2500 words; no unedited AI text.

### Track F — Screencast (S4 core)

Capture material **while doing the work in Tracks A/B/F**, not afterwards.
Editing is a single sit-down at the end of the week.

- [ ] While Track A's Happy Path scenario is being finalized: record one clean
      pass of the scenario running green in Apidog. Real terminal only, no
      pre-recorded fakes (auto-penalty).
- [ ] While Track B's AI diff is being built: record one pass of AI generation
      producing cases, then one pass of the diff being walked through.
- [ ] Record one pass of a Pact consumer test suite passing
      (`npm run test:pact`) and one pass of the provider verifier (46/51 green
      across `eshop-web`, `eshop-admin`, and `eshop-mobile`, with the five
      documented failures visible — the failures are part of the teaching
      material, don't hide them).
- [ ] If arrangeable: record a deliberately-broken provider run so the failure
      is informative — e.g. rename `price` to `unitPrice` in `server.js` per the
      seminar activity script in `Material/Document/Pact/EShop_Pact_Plan.md` §12.
- [ ] Edit to 5–8 minutes total. Constraints: **1080p, ≤100 MB, English
      narration, no background music**. Deliver to
      `Material/Deliveries/S5_Pre-Share/Demo_Screencast.mp4`.

**Exit criterion:** single mp4, 5–8 min, meets all format constraints, walks
through at least one Apidog manual scenario + one Apidog AI feature + one Pact
verification.

### Track G — Activity worksheet (S4 core)

Feeds: S6's 20-minute audience activity.

- [ ] Draft `Material/Deliveries/S5_Pre-Share/Activity_Worksheet.md`. Design for **20 min
      audience work + 5 min walkthrough**, so total ≤ 25 min hard.
- [ ] Concrete task shape: give each audience team the running SUT + a small
      subset of the Apidog collection, ask them to (a) find one defect the
      hand-built cases catch, (b) generate cases with the AI feature for one
      endpoint and identify one thing the AI got wrong. This directly exercises
      the S6 narrative.
- [ ] Write an **answer key** at the end (same file, separated clearly) —
      required by the S1 rubric.
- [ ] Time it against the timer once, alone, before rehearsal.

**Exit criterion:** worksheet + answer key committed; single dry-run timed to
finish inside 25 min including walkthrough.

### Track H — Slides (S4 core)

- [ ] Draft `Material/Deliveries/S5_Pre-Share/Seminar_Slides.pptx`, **≤ 15 slides** (hard cap
      per rubric).
- [ ] Structure aligned to S6 timing: 10-min pitch → 10-min live demo → 20-min
      activity → 5-min Q&A.
- [ ] Pitch section slides: problem statement, why CDC + spec-based both, tool
      comparison matrix (from S1 proposal), M5 metrics table, M6 findings
      teaser.
- [ ] Demo section slides: minimal — the demo is live, slides are just anchors.
- [ ] Activity section slides: worksheet instructions and timing.

**Exit criterion:** deck committed, ≤ 15 slides, rehearses cleanly in ≤ 10 min
for the pitch portion.

### Track I — S8 drafting (starts, does not finish this week)

Kicked off in Week 08 per plan; the pre-seminar portion can be finished before
S5, only the live-seminar reflection has to wait until after S6.

- [ ] `[AI-02]` audit report (≥ 600 words): prompts used, what each AI tool
      generated, what was verified against primary sources, and where AI output
      was wrong. Two AI tools in scope — Claude (docs + planning), GitHub
      Copilot (Pact implementation). Leave the live-seminar reflection
      sub-section for post-S6.
- [ ] `[AI-03]` disclosure form prepared for signature per member.
- [ ] `[AI-04]` reflective statement (300 words): draft everything except the
      live-seminar reflection.

**Exit criterion:** `[AI-02]` and `[AI-04]` drafts committed with placeholders
for the post-seminar sections; `[AI-03]` ready to sign.

## S5 pre-share — the four files

Deadline: **end of Week 09**, at least 3 working days before S6.

- [ ] `Material/Deliveries/S5_Pre-Share/User_Guide.md` (Track E)
- [ ] `Material/Deliveries/S5_Pre-Share/Demo_Screencast.mp4` (Track F)
- [ ] `Material/Deliveries/S5_Pre-Share/Activity_Worksheet.md` (Track G)
- [ ] `Material/Deliveries/S5_Pre-Share/Seminar_Slides.pptx` (Track H)

Push all four to Moodle in one submission, not staggered.

## Cut order — pull smallest first if a track slips

Do not preemptively cut. Only pull from this list if a track visibly slips past
its exit criterion and the S5 deadline is threatened. Pulls are in order,
smallest first.

1. **M5 flake rate:** drop from N ≥ 5 to N = 3, note honestly.
2. **Track A four-scenario matrix:** drop to two scenarios (Positive + one
   Negative). Happy Path scenario stays — screencast needs it.
3. **Track B second failure-mode candidate:** ship one AI-specific FM instead of
   two; backfill M3-Apidog from the "silent scenario chaining" candidate
   instead.
4. **Track A defect-endpoint extension:** stop after `PUT /api/users/me`.
   `GET /api/products/:id` and `POST /api/checkout` covered only in the User
   Guide's Defects sub-section, not as Apidog cases.
5. **Track F broken-provider recording:** drop; walk through it live in S6
   instead.
6. **Track B AI diff scope:** narrow from all covered endpoints to 2 endpoints.
7. **Track I `[AI-04]` full draft:** ship a bullet-outline instead of prose;
   finish after S5.

Anything below cut #5 threatens the seminar itself — pause and reassess before
cutting further.

## Risks entering Week 09

| Risk                                                          | Mitigation                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Hosted-LLM setup consumes more than half of Tuesday           | Use the $100 credit path directly — do not evaluate providers, pick the fastest to enable |
| Screencast recording is treated as a Friday task              | Capture clips during Tracks A/B/F work; Friday is edit-only                               |
| User Guide is rewritten from scratch instead of transcribed   | Explicit source-document per section listed in Track E — treat those as authoritative     |
| Activity worksheet designed but never timed                   | Dry-run timing is an exit criterion, not an optional check                                |
| Track A defect-endpoint extension expands without a stop rule | Cut list #4 is the stop rule — invoke it if the extension has not landed by mid-week      |
| Post-S5 changes break the pre-share materials                 | After S5 submission, freeze the four files; further work goes to `_v2` copies only        |

## Cross-references

**Reads from:** `Material/Document/Apidog/EShop_Apidog_Steps.md`, `Material/Document/Apidog/EShop_Apidog_Setup.md`,
`Material/Document/Apidog/EShop_Apidog_TestCases.md`, `EShop_OpenApi.yaml`, `Material/Document/SUT-Reference/EShop_Defect.md`,
`Material/Document/SUT-Reference/EShop_Failure_Modes.md`, `Material/Document/Pact/EShop_Pact_Plan.md`,
`Material/Document/Planning/W07_Action_Plan.md`, and `Material/Document/Planning/W08_Action_Plan.md`.

**Updates:** `Material/Document/SUT-Reference/EShop_Failure_Modes.md` (Track D adds ≥ 2 Apidog entries);
`Material/Deliveries/S5_Pre-Share/*` (all four S5 files land here); `Material/Config/`
(exported Apidog project from Track A); `Material/Evidence/` (M1 screenshot).
