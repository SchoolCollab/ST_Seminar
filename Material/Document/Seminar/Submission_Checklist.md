# Submission Checklist — What's Actually Left

## Overview

Ordered by what genuinely blocks submission, not by when it was mentioned.
Checked items are independently verified today (real command output, real commit
hashes) — not self-reported claims taken on faith, given two of those turned out
false today (FM-05, the reorganization).

## Done, verified

- [x] Pact: **51 interactions, 46/51 baseline, three consumers** (eshop-web
      14/17, eshop-admin 20/21, eshop-mobile 12/13) — confirmed via one single,
      complete `run_tests.sh` execution, exit 0, clean `git status`. Commit
      `a8628f0`.
- [x] Six documented failure modes (FM-01 through FM-06), FM-05 now documenting
      two independent occurrences with a precise distinction between the
      assert-around-it fix and the verified-safe production-code cleanup, and
      FM-06 documenting the Apidog AI role-field contradiction.
- [x] Seven confirmed EShop defects surfaced through Pact work across all three
      consumers.
- [x] `Material/Document/` reorganized by type — confirmed via real `git log`,
      `git show --stat`, and `ls` output.
- [x] S5/S8 deliverable files refreshed to current Pact numbers: 46/51 across
      three consumers.
- [x] Backend prerequisites, all three consumers' API-client extractions, full
      CI for all three consumers (web, admin, mobile).
- [x] Pact CI made honest, not advisory-masked: `continue-on-error` removed from
      each consumer's provider-verification step (it now fails the job for real
      on a mismatch, with the failing consumer(s) named in the log), the
      backend-only-push trigger gap fixed on all three consumer workflows, and
      the `[EXPECTED TO FAIL...]` tags removed from the 3 Pact interaction
      descriptions they were annotating (now redundant given the real red
      status). Re-verified 14/17, 20/21, 12/13 baseline unaffected via
      `run_tests.sh` on an `ubuntu-latest`-matching environment. Commits
      `3f4f898`, `8afcf9b`.

## Blocking submission — do these first

- [x] **`run_tests.sh` fixed and verified** — three-state pass/
      mismatch/fail logic, real syntax check via a working bash binary, real
      full execution matching the documented 14/17 + 20/21 + 12/13 baseline,
      clean `git status`. Commit `f525acd`.
- [ ] **M4 — Apidog AI generation, 2 endpoints** (`PUT /api/users/me`,
      `GET /api/products/:id`). Partially complete. `PUT /api/users/me`
      generated and executed: 25 requests, 9 passed, 16 failed, with SEC-06
      confirmed live (`expected 403`, actual `200`). `GET /api/products/:id`
      generation started but stopped early because the free-plan Google/Gemini
      key hit a bandwidth/quota limit; no execution report exists yet.
- [ ] **M5 — metrics table.** Blocked on deciding whether to retry the partial
      `GET /api/products/:id` AI generation or explicitly freeze M4 as partial.
      Apidog manual, Pact, and the `PUT /api/users/me` AI setup/run data are now
      knowable; this is mostly transcription once M4's final scope is decided.
- [ ] **Record `Demo_Screencast.mp4`** — the script exists and is current; the
      actual video does not.
- [ ] **Build `Seminar_Slides.pptx`** — the outline exists and is current; the
      actual deck does not.
- [ ] **Sign `AI_03_Disclosure_Form.md`** — needs your name, ID, and signature;
      the form itself is ready.

## Not blocking today's submission — genuinely optional

- [ ] `README.md` under `Material/Deliveries/` — empty, cosmetic only.

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

1. Decide M4's final scope: retry `GET /api/products/:id` generation, or freeze
   the AI track as one executed endpoint plus one documented partial endpoint.
2. M5 metrics table — fast once M4's final scope is decided.
3. `run_tests.sh` sanity check — five minutes, do it whenever convenient.
4. Weekly report — written last, once the real state is final.
5. Screencast recording, slide deck build, disclosure signature — these are
   yours alone; nothing I generate substitutes for them.
