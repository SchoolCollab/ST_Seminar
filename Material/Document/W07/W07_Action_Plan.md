# T06 — Action Plan (Week 07)

## Overview

This plan covers Week 07 and revises the remaining schedule after two lost
weeks. It is the _stage plan_ (S1–S8) — a separate document from the weekly
Moodle report, which is a per-week log.

Two hard external constraints anchor everything else: the **S5 pre-share** is
due at least 3 working days before the seminar (so by end of Week 09), and the
**S8 audit pack** is due within 5 working days of the seminar (Week 11). Seminar
week is Week 10.

**What changed since the Week 06 plan.** Weeks 05 and 06 produced no seminar
work (midterm exams, plus preparation and on-site running of a company
game-promotion event). No Week 06 report was submitted. Work resumed in Week 07
and was delivered **out of planned order**: the Pact contract-testing track —
originally scoped for Week 07 — was completed, while the Apidog manual test-case
work originally scoped for Week 06 remains outstanding. Two further changes:

- **Apidog AI (M4) is deferred to Week 08**, gated on standing up a local AI
  model (Ollama) as Apidog's model provider. Apidog uses a bring-your-own-model
  approach, so a local model keeps M4 free and preserves the $100 of Anthropic
  API credit for the live seminar demo, where reliability matters more than
  during study work.
- **Pact Iteration 1 is complete** at one consumer (`eshop-web`), 10
  interactions, and one provider verification. Iterations 2 and 3 from
  `EShop_Pact_Plan.md` (adding `frontend-admin`, `frontend-mobile`, hard
  `can-i-deploy` gating) are **not yet executed, not cancelled** — they were
  deprioritized behind S4/S5, which carry far more grade weight, and remain on
  the roadmap to pick up as schedule allows.

## Where the stages land on the calendar

| Semester week     | Report label       | Stage state                                                                                                      |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Week 04           | Report Week 01     | S1 + S2 done (proposal submitted)                                                                                |
| Week 05           | Report Week 02     | No work — midterm exams                                                                                          |
| Week 06           | Report Week 03     | No work — midterm exams + company event; **no report submitted**                                                 |
| **Week 07 (now)** | **Report Week 04** | **S3 partial — OpenAPI spec, defect catalogue, and Pact/M6 done; M1 partial; M2, M3-Apidog, M4, M5 outstanding** |
| Week 08           | Report Week 05     | S3 finish (M2, M3-Apidog, M4, M5) + S4 start; S8 drafting begins                                                 |
| Week 09           | Report Week 06     | S4 finish + rehearsal → **S5 pre-share by end of Week 09**                                                       |
| **Week 10**       | **Report Week 07** | **S6 live seminar + S7 audience feedback**; S8 reflection finalized within 2 working days                        |
| Week 11           | Report Week 08     | Buffer only — audit pack should already be submitted                                                             |

**Schedule risk.** Two weeks of slack are gone. S3 now finishes in Week 08
concurrently with the start of S4, and S4 must be complete by end of Week 09 for
the pre-share. There is no remaining buffer before the seminar; Week 11 is the
only slack left and it sits _after_ the graded event.

## S1–S8 stages

| Stage  | Name                    | What it is                                                                                                                                                                 |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | Tool Survey & Proposal  | ≤1-page proposal listing candidate tools, a comparison matrix on 5 criteria, the pick + 3-bullet rationale, and an AI disclosure. Due W6 Sat.                              |
| **S2** | Instructor Approval     | Verdict within ≤2 working days: APPROVED, MINOR-CHANGE, or RECLAIM. Locks the toolset.                                                                                     |
| **S3** | Deep Study on EShop     | Hands-on tool study against EShop, 1–2 weeks. Delivers milestones M1–M6.                                                                                                   |
| **S4** | User Guide + Screencast | `User_Guide.md` (7 sections including Failure Modes) plus a 5–8 minute demo screencast.                                                                                    |
| **S5** | Pre-share               | Push four files to Moodle at least 3 working days before the live seminar: `User_Guide.md`, `Demo_Screencast.mp4`, `Activity_Worksheet.md`, `Seminar_Slides.pptx`.         |
| **S6** | Live Seminar            | 45-minute session: 10-min pitch → 10-min live demo → 20-min audience activity → 5-min Q&A.                                                                                 |
| **S7** | Audience Feedback       | Collect one minute-paper per audience team at the end of S6.                                                                                                               |
| **S8** | AI Audit + Reflect      | Three artefacts: `[AI-02]` audit report (≥600 words), `[AI-03]` signed disclosure per member, `[AI-04]` reflective statement (300 words). Due within 5 working days of S6. |

## S3 milestones

| Milestone    | What it delivers                                                                                                              | Status                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **M1**       | Install the tool and pass its official "hello world" — first successful request against a running SUT.                        | Partial — spec imported, environment and auth configured  |
| **M2**       | Run one end-to-end scenario against EShop with human-authored assertions (login → products → cart → orders).                  | Outstanding                                               |
| **M3**       | Document three real failure modes of the tooling.                                                                             | Partial — FM-01 (Apidog), FM-02 (Pact) logged             |
| **M4**       | Reproduce the same scenario with the AI variant — generate tests from the OpenAPI spec, then diff hand-built vs AI-generated. | Deferred to Week 08 (local AI)                            |
| **M5**       | Capture metrics: setup time, full-scenario run time, flake rate across N runs.                                                | Outstanding                                               |
| **M6 (T06)** | One Pact provider verification against the EShop backend plus documented contract violations.                                 | **Done** — 8/10 interactions verified, 2 violations found |

## S3 scope this week and next

**This week (Week 07):** M6 (done), M3-Pact (done), M1 completion, M2,
M3-Apidog. **Next week (Week 08):** M4 (after local AI setup), M5, and the start
of S4.

## Week 07 work

Work is grouped by kind, not by day. The Documentation and Contract groups are
complete; Baseline and Automation carry over into Sunday and Monday.

### Documentation — complete

- [x] Author the implementation-truth OpenAPI 3.0.3 spec (`EShop_OpenApi.yaml`)
      from `backend/server.js`, `api_specification.md`, and the SRS. 24 paths,
      31 operations, 30 schemas; validates clean. Named request examples added
      per endpoint, plus `x-apidog-status` on every operation.
- [x] Compile `EShop_Defect.md` — every observed deviation between
      implementation and either the SRS or REST convention, each citing a
      `server.js` line.
- [x] Write the Apidog reference set: `EShop_Apidog_Steps.md` (13-step build),
      `EShop_Apidog_Setup.md` (runtime config), `EShop_Apidog_TestCases.md` (all
      31 operations).
- [x] Restructure `Material/` into `Config/`, `Document/General/`,
      `Document/W07/`.

### Contract testing (M6, M3-Pact) — complete

- [x] Refactor `frontend-web` to a single `apiClient` (`axios.create()`),
      replacing hard-coded base URLs across 7 pages/contexts;
      `VITE_API_BASE_URL` override enables Pact mock injection.
- [x] Write 10 consumer interactions for `eshop-web` (auth, products,
      cart/checkout); `npm run test:pact` emits
      `pacts/eshop-web-eshop-backend.json`.
- [x] Backend prerequisites: `module.exports = app` with a `require.main` guard,
      `POST /_pact/setup` mounted only under `NODE_ENV=test`, SQLite `:memory:`
      in test mode with `resetDatabase()`.
- [x] Provider verifier + state handlers; broker-optional (falls back to the
      local pact file when `PACT_BROKER_BASE_URL` is unset).
- [x] CI workflows for consumer publish and provider verify, plus a local broker
      `docker-compose.yml`.
- [x] Result: **8/10 interactions verified**; 2 failures — `POST /api/checkout`
      (contract `order_id` vs server `orderId`, surfacing a real
      naming-convention inconsistency logged in `EShop_Defect.md`) and
      `GET /api/cart` (contract `{cart:[]}` vs server/spec bare `[]`, a
      contract-authoring mistake with no underlying defect).
- [x] Log FM-02 — `PactV3`'s Rust FFI crashes on `MatchersV3.regex` applied to
      headers.

### Housekeeping — carry over to Sunday

- [ ] Confirm the `Authorization` value recorded in the committed pact file is a
      placeholder, not a real signed JWT. The verifier's `requestFilter` injects
      the real token at verification time, so the contract only needs a dummy —
      but a real token published to a broker would be a leak.
- [ ] Reconsider the plain-literal `Content-Type` assertion. Because regex
      matchers crash the FFI, a literal is the only option; if the server ever
      appends `; charset=utf-8` the assertion breaks for a cosmetic reason.
      Prefer dropping the header assertion and relying on status + body shape.
- [ ] Add `backend/database.sqlite` to `.gitignore` and remove it from tracking
      — `:memory:` now covers test mode, and a binary DB in git churns on every
      run.

### Baseline — hand-built end-to-end scenario (M2) — Sunday/Monday

- [ ] Build the four-scenario matrix on `POST /api/cart` end-to-end (Positive /
      Security / Boundary / Negative), following `EShop_Apidog_Steps.md` Step 6
      and 6a.
- [ ] Work outward through `EShop_Apidog_TestCases.md`, prioritising endpoints
      with documented defects so the cases double as defect evidence.

### Automation — Sunday/Monday

- [ ] Build the `Happy Path Purchase` test scenario (login → products → cart →
      checkout → my-orders) with `productId` and `orderId` captured by Store
      Variable processors.
- [ ] Confirm a cold run from an emptied environment passes without manual
      intervention.
- [ ] Export the Apidog project so no work lives only in local storage.

### Documentation and wrap (M3 — Apidog) — Sunday/Monday

- [ ] Log two further Apidog-side failure modes to complete M3's "three per
      tool" requirement (FM-01 is the first). Candidates already flagged in
      `EShop_Failure_Modes.md`: AI generating assertions on
      documented-but-invalid fields, schema auto-validation passing on the
      `{}`-on-404 quirk, and scenario chaining continuing silently after a
      failed step.

## Week 08 — S3 finish + S4 start

See `W08_Action_Plan.md`. Headline: stand up the local AI model, run M4 and the
hand-vs-AI diff, capture M5 metrics, and begin the User Guide.

## Week 09 — S4 finish, S5 pre-share

- [ ] `User_Guide.md` complete: 7 sections including the required **Failure
      Modes** section (skipping it is an auto-penalty).
- [ ] Record the 5–8 minute screencast (1080p, ≤100 MB, English narration, no
      music, real terminal).
- [ ] `Activity_Worksheet.md` + answer key finalized and timed under 25 minutes.
- [ ] Slides ≤ 15.
- [ ] **S5 pre-share (hard deadline — end of Week 09):** push all four files to
      Moodle.

## Week 10 — Live seminar + S8 finalize

**S6 (45 min):** 10 pitch → 10 live demo (traditional **and** AI features, both
live) → 20 activity → 5 Q&A. Backup recording on the laptop in case the network
fails.

**S7:** collect one minute-paper per audience team.

**S8 (within 2 working days):** add the live-seminar reflection to `[AI-02]`,
finish `[AI-04]`, sign `[AI-03]`, submit.

## Week 11 — Buffer

Only used if S8 slips.
