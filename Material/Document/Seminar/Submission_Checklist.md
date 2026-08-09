# Submission Checklist — What's Actually Left

## Overview

Ordered by what genuinely blocks submission, not by when it was mentioned.
Checked items are independently verified today (real command output, real commit
hashes) — not self-reported claims taken on faith, given two of those turned out
false today (FM-05, the reorganization).

## Done, verified

- [x] Pact: **64 interactions, 56/64 baseline, three consumers** (eshop-web
      14/17, eshop-admin 20/21, eshop-mobile 12/13) — confirmed via one single,
      complete `run_tests.sh` execution, exit 0, clean `git status`. Commit
      `a8628f0`.
- [x] Five documented failure modes (FM-01 through FM-05), FM-05 now documenting
      two independent occurrences with a precise distinction between the
      assert-around-it fix and the verified-safe production-code cleanup.
- [x] Seven confirmed EShop defects surfaced through Pact work across all three
      consumers.
- [x] `Material/Document/` reorganized by type — confirmed via real `git log`,
      `git show --stat`, and `ls` output.
- [x] S5/S8 deliverable files refreshed to current Pact numbers (now stale again
      re: the exact interaction counts — 34/38 → 56/64 — worth one more
      numbers-only pass before final submission, low priority given the shape of
      the narrative hasn't changed).
- [x] Backend prerequisites, all three consumers' API-client extractions, full
      CI for two consumers (mobile CI still optional/not added).

## Blocking submission — do these first

- [x] **`run_all_tests.sh` fixed and verified** — three-state pass/
      mismatch/fail logic, real syntax check via a working bash binary, real
      full execution matching the documented 14/17 + 20/21 baseline, clean
      `git status`. Commit `f525acd`.
- [ ] **M4 — Apidog AI generation, 2 endpoints** (`PUT /api/users/me`,
      `GET /api/products/:id`). Not started. Guide ready
      (`Apidog_AI_Generation_Guide.md`). This is the single most time-sensitive
      item — the seminar's own auto-penalty rule requires demoing both a
      traditional AND an AI feature live.
- [ ] **M5 — metrics table.** Blocked on M4 existing (needs AI setup time as one
      of the three data points). Apidog manual and Pact setup/run times are
      already knowable from today's real work; once M4 runs, this is mostly
      transcription, not new work.
- [ ] **Record `Demo_Screencast.mp4`** — the script exists and is current; the
      actual video does not.
- [ ] **Build `Seminar_Slides.pptx`** — the outline exists and is current; the
      actual deck does not.
- [ ] **Sign `AI_03_Disclosure_Form.md`** — needs your name, ID, and signature;
      the form itself is ready.

## Not blocking today's submission — genuinely optional

- [ ] `README.md` under `Material/Deliveries/` — empty, cosmetic only.
- [ ] CI workflow for `eshop-mobile` — the two other consumers have advisory
      `can-i-deploy` workflows; mobile doesn't yet. Small, genuinely optional
      given the narrow 2-interaction scope.

## Correctly waiting, not actually incomplete

- [ ] `AI_02_Audit_Report.md` §4 (live-seminar reflection) — cannot be written
      before the seminar happens. Don't try to fill this today.
- [ ] `AI_04_Reflective_Statement.md` §2 — same reason.
- [ ] `S7_Audience_Feedback_Template.md` — a template for capturing live
      audience data; nothing to fill until S6 actually runs.

## This week's report

- [ ] Write `Group12_09.md`/`.pdf` (Report Week 09, 2026-08-03–08-08) — the last
      item, written once everything above that affects its content is settled.
      Gap week (07-26–08-02) intentionally not mentioned, per your instruction.

## Recommended order for the rest of today

1. M4 (both endpoints) — the actual bottleneck; everything else can proceed in
   parallel with it or after.
2. `run_all_tests.sh` fix — five minutes, do it whenever convenient.
3. M5 metrics table — fast once M4 exists.
4. Weekly report — written last, once the real state is final.
5. Screencast recording, slide deck build, disclosure signature — these are
   yours alone; nothing I generate substitutes for them.
