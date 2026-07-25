# T06 — Action Plan (Week 08)

## Overview

Week 08 closes out S3 and opens S4. It carries the two milestones deferred from Week 07 — **M4** (AI test generation and the hand-vs-AI diff) and **M5** (metrics) — and must simultaneously start the User Guide, because the S5 pre-share falls at the end of Week 09 and there is no slack left before it.

The critical path this week is the **local AI setup**. M4 is blocked until Apidog has a working model provider, and the deliberate choice is to use a locally-hosted model rather than a paid API so the $100 of Anthropic API credit stays intact for the live seminar demo in Week 10. If the local setup fails, the fallback is an external LLM used sparingly — but that decision should be made early in the week, not on Friday.

## Where the stages land on the calendar

| Semester week     | Report label       | Stage state                                                                                              |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| Week 07           | Report Week 04     | S3 partial — spec, defect catalogue, Pact/M6 done; M2/M3-Apidog carried into the weekend                  |
| **Week 08 (now)** | **Report Week 05** | **S3 finish — M4, M5; S4 begins (`User_Guide.md` skeleton, screencast material captured)**                |
| Week 09           | Report Week 06     | S4 finish + rehearsal → **S5 pre-share by end of Week 09**                                               |
| **Week 10**       | **Report Week 07** | **S6 live seminar + S7 audience feedback**; S8 reflection finalized within 2 working days                  |
| Week 11           | Report Week 08     | Buffer only                                                                                              |

## S3 milestones — remaining

| Milestone | What it delivers                                                                                                              | Status entering Week 08                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **M1**    | Install + "hello world" against the running SUT.                                                                              | Expected complete over the weekend         |
| **M2**    | End-to-end scenario with human-authored assertions.                                                                           | Expected complete over the weekend         |
| **M3**    | Three real failure modes per tool.                                                                                            | FM-01 (Apidog), FM-02 (Pact) logged; 2 more Apidog-side needed |
| **M4**    | Reproduce the scenario with the AI variant; diff hand-built vs AI-generated.                                                   | **This week — blocked on local AI setup**  |
| **M5**    | Metrics: setup time, run time, flake rate.                                                                                     | **This week**                              |
| **M6**    | Pact provider verification + documented contract violations.                                                                   | Done in Week 07                            |

## Week 08 work

Work is grouped by kind. The AI setup group gates the AI comparison group; everything else can run in parallel.

### AI setup — do this first, it blocks M4

- [ ] Install a local model runner (Ollama) and pull a model capable of structured test-case generation.
- [ ] Apidog → Organization/Team Settings → **AI Features** → enable → **+ Add Provider** → point at the local model (custom API configuration against the Ollama endpoint).
- [ ] Verify with one throwaway generation on a simple endpoint (`GET /api/categories`) before committing to the full M4 run.
- [ ] Record the setup cost honestly for M5: install time, model download size, first-generation latency. Local inference is slower than a hosted API and that trade-off is part of the finding.
- [ ] **Decision gate (by mid-week):** if the local provider is not working, switch to an external LLM used only for the endpoints that matter to the diff, and note the cost/benefit in the User Guide. Do not spend the whole week debugging inference setup.

### AI comparison (M4)

- [ ] For each endpoint already covered by hand-built cases, open **Test Cases → Generate with AI** and save the output as a separate, clearly-named collection so the two sets stay comparable.
- [ ] Build the diff table — the centrepiece of the seminar:
  - What the AI covered well — schema shape, declared types, status codes, required fields.
  - What the AI missed — business rules absent from the spec: coupon reuse, ordering beyond stock, cross-user cart access, expired sessions, race conditions.
  - What the AI got wrong — assertions on non-existent fields, invented endpoints, overconfident "valid" cases, auth ignored on protected routes.
  - Coverage against the four-scenario matrix — does the AI generate invalid-auth and not-found cases at all, or only happy paths?
- [ ] Check the two AI-specific predictions already logged as candidates in `EShop_Failure_Modes.md`: whether the AI generates a "valid" case including `role` on `PUT /api/users/me` (validating SEC-06 as if it were a feature), and whether Apidog's schema auto-validation passes on the `{}`-with-200 response from `GET /api/products/{id}`. Either confirmation becomes a numbered failure mode.
- [ ] Screenshot the diff — it is both M4 evidence and a User Guide figure.

### Metrics (M5)

- [ ] Setup time: spec import → first green request (Apidog); install → first passing verification (Pact); install → first AI generation (local model).
- [ ] Run time: full hand-built collection; full AI-generated collection; Pact consumer + provider verification.
- [ ] Flake rate: run the full collection N times (N ≥ 5) and record non-deterministic failures. Expect the in-memory cart and the shared SQLite file to be the main sources.
- [ ] Record all three in a single table — this is the quantitative half of the tool comparison and the S1 proposal promised it.

### Failure modes (M3 completion)

- [ ] Bring the Apidog-side count to three. FM-01 is logged; the AI comparison work above is the most likely source of the remaining two.
- [ ] Keep the six-field structure (what happened / where / why misleading / root cause / resolution / lesson) so entries drop straight into the User Guide.

### S4 start — User Guide and screencast material

- [ ] Draft `User_Guide.md` to its 7-section skeleton: Introduction, Installation, First Test, Advanced Usage, Troubleshooting, **Failure Modes**, References.
- [ ] Populate Installation and First Test directly from `EShop_Apidog_Steps.md` — that document was written as a walkthrough and largely transfers.
- [ ] Populate Failure Modes from `EShop_Failure_Modes.md`; populate the defect discussion from `EShop_Defect.md`.
- [ ] Capture screencast material *while doing the work above*, not afterwards: one clean recording of the hand-built scenario passing, one of AI generation plus the diff, one of the Pact verifier running (and, if arrangeable, a deliberately-broken provider so the failure is informative).
- [ ] No AI-generated text goes into the guide unedited — that is an explicit auto-penalty.

### S8 drafting

- [ ] Start `[AI-02]` (audit report, ≥600 words) from the material already accumulated: prompts used, what each tool generated, what was verified against primary sources, and where AI output was wrong. Two AI tools are in scope — Claude for documents and planning, GitHub Copilot for the Pact implementation.
- [ ] Prepare `[AI-03]` for signature.
- [ ] Leave the live-seminar reflection sections until after Week 10; everything else can be written now.

## Week 09 — S4 finish, S5 pre-share

- [ ] `User_Guide.md` complete and edited.
- [ ] Screencast cut to 5–8 minutes (1080p, ≤100 MB, English narration, no background music, real terminal — no pre-recorded fakes).
- [ ] `Activity_Worksheet.md` + answer key, timed to finish inside 25 minutes.
- [ ] `Seminar_Slides.pptx`, ≤ 15 slides.
- [ ] Full dress rehearsal against a timer.
- [ ] **S5 pre-share by end of Week 09** — all four files to Moodle. Hard deadline; the audience needs three working days with the materials.

## Week 10 — Live seminar

10-min pitch → 10-min live demo → 20-min activity → 5-min Q&A. The demo must show at least one traditional feature and one AI feature, both genuinely live. This is where the reserved $100 API credit is spent, if the live AI generation needs a hosted model for reliability. Backup recording ready in case the network fails.

## Risks entering Week 08

| Risk                                                              | Mitigation                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local AI setup consumes the week and M4 never runs                | Hard mid-week decision gate; fall back to an external LLM for a reduced endpoint set rather than debugging indefinitely   |
| S3 and S4 running concurrently causes both to be shallow          | S4's Installation/First Test sections are largely transcription from existing documents, not new writing                  |
| No slack remains before the Week 09 pre-share                     | Capture screencast material during the work itself, so recording is not a separate task competing for Week 09 time        |
| Weekend M2 work slips, pushing the baseline into Week 08          | M4's diff needs hand-built cases to compare against; if M2 slips, narrow M4 to the endpoints that do have cases          |
