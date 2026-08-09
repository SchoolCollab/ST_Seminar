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
- [x] M4 Apidog AI scope frozen: `PUT /api/users/me` generated and executed
      with SEC-06 confirmed live; `GET /api/products/:id` also generated and
      executed. Final AI scope is two endpoint sets, 46 generated cases total,
      with separate HTML reports for both endpoints.

## Blocking submission — do these first

- [x] **`run_tests.sh` fixed and verified** — three-state pass/
      mismatch/fail logic, real syntax check via a working bash binary, real
      full execution matching the documented 14/17 + 20/21 + 12/13 baseline,
      clean `git status`. Commit `f525acd`.
- [ ] **M5 — metrics table.** Scaffold exists in `User_Guide.md` §4.3. Needs
      exact measured values or explicit "not measured" entries for Apidog
      manual, Apidog AI, and Pact.
- [ ] **Apidog TestSuite execution** — next active work item. Build/run the
      `EShop — Full Regression` suite from
      `Material/Document/Apidog/EShop_Apidog_TestSuite_Plan.md`; the current
      combined checkpoint contains 209 suite references (163 manual + 46 AI).

## Not blocking today's submission — genuinely optional

- [ ] `README.md` under `Material/Deliveries/` — empty, cosmetic only.

## Correctly waiting, not actually incomplete

- [ ] **Record `Demo_Screencast.mp4`** — on hold by current instruction.
- [ ] **Build `Seminar_Slides.pptx`** — on hold by current instruction.
- [ ] **Sign `AI_03_Disclosure_Form.md`** — on hold by current instruction.
- [ ] `AI_02_Audit_Report.md` §4 (live-seminar reflection) — cannot be written
      before the seminar happens. Don't try to fill this today.
- [ ] `AI_04_Reflective_Statement.md` §2 — same reason.
- [ ] `S7_Audience_Feedback_Template.md` — a template for capturing live
      audience data; nothing to fill until S6 actually runs.

## This week's report

- [x] Weekly report for this week is obsolete by current instruction; do not
      spend time producing `Group12_09.md`/`.pdf`.

## Recommended order for the rest of today

1. Apidog TestSuite build/execution.
2. M5 metrics values, using the TestSuite report once it exists.
3. `run_tests.sh` sanity check — five minutes, do it whenever convenient.
4. Screencast recording, slide deck build, disclosure signature — explicitly on
   hold for now.
