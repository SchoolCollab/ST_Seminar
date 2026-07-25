# T06 — Action Plan

## Overview

This plan drives the T06 seminar work from Week 06 through the live seminar in
Week 10, plus the S8 AI Audit pack finalized right after. It is the _stage plan_
(S1–S8) — a separate document from the weekly Moodle report, which is a per-week
log.

Two hard external constraints anchor everything else: the **S5 pre-share** is
due at least 3 working days before the seminar (so by end of Week 09), and the
**S8 audit pack** is due within 5 working days of the seminar (Week 11). Seminar
week is Week 10.

## Where the stages land on the calendar

Semester weeks vs weekly-report labels vs stage state. Weekly reports run 08
weeks; the seminar spans stages S1–S8.

| Semester week     | Report label       | Stage state                                                                               |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Week 04           | Report Week 01     | S1 + S2 done (proposal submitted)                                                         |
| Week 05           | Report Week 02     | No work; treated as slack                                                                 |
| **Week 06 (now)** | **Report Week 03** | **S3 in progress — M1, M2, M4, M3 (Apidog only)**                                         |
| Week 07           | Report Week 04     | S3 finish — M3 (Pact), M5, M6; **S8 audit drafting begins**                               |
| Week 08           | Report Week 05     | S4 — `User_Guide.md` draft, screencast recording; S8 drafts continue                      |
| Week 09           | Report Week 06     | S4 finish + rehearsal → **S5 pre-share by end of Week 09**                                |
| **Week 10**       | **Report Week 07** | **S6 live seminar + S7 audience feedback**; S8 reflection finalized within 2 working days |
| Week 11           | Report Week 08     | Buffer only — audit pack should already be submitted                                      |

**Why S8 shifts earlier:** the pack has three parts — `[AI-02]` audit report
(≥600 words), `[AI-03]` signed disclosure, `[AI-04]` reflection (300 words).
Most of the raw material — prompts, AI outputs, the hand-vs-AI diff,
verification steps — is generated during S3 and S4. Drafting `[AI-02]` and
`[AI-03]` alongside those stages is straightforward; only the `[AI-04]`
reflection genuinely needs the live-seminar experience to write authentically.

## S1–S8 stages

The Seminar Track defines an 8-stage workflow from claiming a topic to auditing
AI use. Every "S" reference in this plan maps to one of them.

| Stage  | Name                    | What it is                                                                                                                                                                 |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | Tool Survey & Proposal  | ≤1-page proposal listing candidate tools, a comparison matrix on 5 criteria, the pick + 3-bullet rationale, and an AI disclosure. Due W6 Sat.                              |
| **S2** | Instructor Approval     | Verdict within ≤2 working days: APPROVED, MINOR-CHANGE, or RECLAIM. Locks the toolset.                                                                                     |
| **S3** | Deep Study on EShop     | Hands-on tool study against EShop, 1–2 weeks. Delivers milestones M1–M6 (see next section).                                                                                |
| **S4** | User Guide + Screencast | `User_Guide.md` (7 sections including Failure Modes) plus a 5–8 minute demo screencast.                                                                                    |
| **S5** | Pre-share               | Push four files to Moodle at least 3 working days before the live seminar: `User_Guide.md`, `Demo_Screencast.mp4`, `Activity_Worksheet.md`, `Seminar_Slides.pptx`.         |
| **S6** | Live Seminar            | 45-minute session: 10-min pitch → 10-min live demo → 20-min audience activity → 5-min Q&A.                                                                                 |
| **S7** | Audience Feedback       | Collect one minute-paper per audience team at the end of S6.                                                                                                               |
| **S8** | AI Audit + Reflect      | Three artefacts: `[AI-02]` audit report (≥600 words), `[AI-03]` signed disclosure per member, `[AI-04]` reflective statement (300 words). Due within 5 working days of S6. |

## S3 milestones

Milestones defined by the T06 topic brief. M1–M5 are common to every deep study;
M6 is the T06-specific contract-testing milestone.

| Milestone    | What it delivers                                                                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**       | Install the tool and pass its official "hello world" — the first successful request against a running SUT.                                                                                                                         |
| **M2**       | Run one end-to-end scenario against EShop with human-authored assertions (login → products → cart → orders in this plan).                                                                                                          |
| **M3**       | Document three real failure modes of the tooling (three for Apidog this week; three for Pact next week).                                                                                                                           |
| **M4**       | Reproduce the same scenario with the AI variant — generate tests from the OpenAPI spec, then diff hand-built vs AI-generated.                                                                                                      |
| **M5**       | Capture metrics: setup time (install → first green), full-scenario run time, flake rate across N runs.                                                                                                                             |
| **M6 (T06)** | One Pact provider verification against the EShop backend plus five documented contract violations (e.g. renamed field, changed type, dropped required field) and how a contract test catches each earlier than an end-to-end test. |

## S3 scope this week and next

**This week (Week 06):** M1, M2, M4, and M3-Apidog.  
**Next week (Week 07):** Pact (M3 for Pact, M5, M6) plus final metrics.

## Week 06 work

Work is grouped by kind, not by day. Groups build on each other in the order
listed (Preparation → Baseline → Automation → AI comparison → Documentation), so
pick them up in sequence but move at whatever pace fits the week.

### Preparation

EShop's repo does not ship an OpenAPI spec, so one must be produced before
anything else — Apidog imports the spec, and the same spec drives the AI
generation later, so it is the foundation for both halves of the
traditional-vs-AI comparison.

Two viable routes for producing the spec:

1. **Runtime introspection** — start EShop, then use `swagger-autogen` or
   `express-openapi-generator` on the Express backend to emit a starter spec,
   then hand-edit.
2. **Hand-authored draft** — write a minimal spec by reading the Express route
   handlers (`app.get`, `app.post`, request/response shapes) and codify them in
   OpenAPI 3 YAML.

**Recommendation:** route 1 for speed, then hand-fix the endpoints the scenario
touches. Route 2 forces deeper understanding of EShop, which strengthens the
Failure Modes section later, but the time cost is high.

- [ ] Install Apidog ≥ v2.7.18 and Node.js 18+.
- [ ] Get EShop running locally (or connect to staging). Note the backend base
      URL and port.
- [ ] Generate or write OpenAPI doc simulating `eshop_openapi.yaml` covering
      `POST /auth/login`, `GET /products`, `POST /cart`, `POST /orders`.
- [ ] Sanity-check the spec — field names, types, required flags, and status
      codes all match what the running server actually returns.
- [ ] Apidog → new project → **Import → OpenAPI/Swagger** →
      `eshop_openapi.yaml`.
- [ ] Create environment `Local` with variables: `baseUrl`, `accessToken`
      (empty), `userEmail`, `userPassword`.
- [ ] Send `GET /products` and confirm 200. **M1 done.**

### Baseline — hand-built end-to-end scenario (M2)

The traditional feature for the demo. Build the core flow with **manual
assertions** on each step: status, response fields, response time under a
threshold.

- [ ] `POST /auth/login` (happy path) → 200, token in body.
- [ ] `GET /products` → 200, array shape, each item matches schema.
- [ ] `POST /cart` → item appears with correct quantity and price.
- [ ] `POST /orders` → 200 / 201, order id returned.
- [ ] Run the whole scenario end-to-end and save it as `EShop_Happy_Path`. **M2
      done.**

### Automation — chained-token hook and scenario assertions

This turns the collection into a self-driving workflow instead of a manual
click-through, and it is what makes the live demo compelling. Two pieces: a
chained-token hook so auth propagates automatically, and scenario-driven
assertion scripts so each endpoint is exercised across the same four cases.

**Chained-token hook.**

- [ ] On `POST /auth/login`, add a **Post-Processor → Extract Variable** that
      reads the token from the response body and writes it to `accessToken`.
- [ ] On every protected request, set the header
      `Authorization: Bearer {{accessToken}}` — Apidog resolves the variable at
      run time.
- [ ] Verify by running the whole collection in one shot; the token should never
      be typed by hand.

**Scenario-driven assertion scripts.** For each endpoint, cover four scenarios
in this order:

| #   | Scenario                 | Assertions                                                                   |
| --- | ------------------------ | ---------------------------------------------------------------------------- |
| 1   | **Success** (happy path) | 2xx status; required response fields present; correct types; expected values |
| 2   | **Invalid auth**         | 401; error body shape matches spec; no protected data leaked                 |
| 3   | **Invalid parameter**    | 400; error names the offending field; state unchanged (e.g. cart unaffected) |
| 4   | **Not found / conflict** | 404 or 409; error body shape matches spec                                    |

**Discipline (worth naming in the write-up):** every invalid case mutates
exactly _one_ field or one value; everything else stays valid. Two mutations at
once means a failure can't be attributed to a single cause. This is
**single-fault-mode** testing on top of **equivalence partitioning** (valid vs
invalid class) and **boundary-value analysis** (edge of the valid range).

Concrete examples for `POST /cart`:

| Case                              | Body                                     | Auth                     | Expected            |
| --------------------------------- | ---------------------------------------- | ------------------------ | ------------------- |
| Success                           | valid `productId`, `quantity` = 1        | valid                    | 200 / 201           |
| Invalid param — bad productId     | non-existent `productId`, valid quantity | valid                    | 404                 |
| Invalid param — zero quantity     | valid `productId`, `quantity` = 0        | valid                    | 400 (boundary)      |
| Invalid param — negative quantity | valid `productId`, `quantity` = -1       | valid                    | 400 (invalid class) |
| Invalid auth                      | valid body                               | missing / invalid header | 401                 |

- [ ] Do the equivalent set for `login`, `products`, and `orders`. Save each
      scenario as its own request inside the collection.

### AI comparison (M4)

The AI feature for the demo, and the heart of the seminar's core lesson (AI
covers the declared schema but misses business rules).

- [ ] Enable Apidog AI: Settings → **AI Features** → on → **+ Add Provider**.
      Connect a local model via Ollama or a free-tier key ($0). Equivalent free
      fallback: paste each endpoint's spec into an external LLM
      (Claude/ChatGPT).
- [ ] For each endpoint, **Test Cases → Generate with AI**. Save AI output in a
      _separate_ collection so it stays comparable.
- [ ] Build the **diff table** — compare against the four-scenario matrix and
      record:
    - What AI covered well — schema, types, status codes, required fields.
    - What AI missed — business rules: cart of another user, coupon reuse,
      ordering more than stock, expired session, race conditions.
    - What AI got wrong — assertions on fields that don't exist, invented
      endpoints, overconfident "valid" cases, ignored auth on protected routes.
    - Coverage of the four-scenario matrix — does the AI generate invalid-auth
      and not-found cases, or only happy-path?
- [ ] Screenshot the diff. **M4 done.**

### Documentation and wrap

Three Apidog-related failure modes for the User Guide:

- [ ] AI generating an assertion on a field that doesn't exist in the spec.
- [ ] Apidog's smart-mock server returning plausible data that masks a real
      backend bug.
- [ ] Variable extraction silently succeeding on the wrong field (e.g.
      extracting `refreshToken` instead of `accessToken`).

Wrap-up:

- [ ] Export both collections so nothing lives only in Apidog's local storage.
- [ ] Save all screenshots, error messages, and prompts to a private folder —
      this feeds S4 and S8.
- [ ] Confirm the whole hand-built scenario runs green in one shot with the
      chained-token hook.

## Week 07 — S3 finish, S8 drafting begins

- [ ] Install `@pact-foundation/pact` and `@pact-foundation/pact-core`. Write
      one consumer expectation → pact JSON → run the verifier against EShop's
      backend. Scope: one verification, no broker.
- [ ] M3 (Pact side) — three Pact-related failure modes.
- [ ] M5 — capture metrics: install-to-first-green time, full-collection run
      time, flake rate across N runs.
- [ ] M6 — five contract violations and how a contract test catches each earlier
      than an end-to-end test.
- [ ] Start `User_Guide.md` structure so Week 08 is writing, not architecting.
- [ ] **S8 groundwork:** start `[AI-02]` audit report from S3 material — prompts
      used, what AI generated, what was verified against primary sources.

## Week 08 — S4 core, S8 drafting continues

- [ ] Full `User_Guide.md` draft: 7 sections plus **Failure Modes** (skipping
      this is an auto-penalty).
- [ ] Record the 5–8 minute screencast (1080p, ≤100 MB, English narration, no
      music, real terminal).
- [ ] `[AI-02]` first complete draft — everything except reflection on the live
      seminar itself.
- [ ] `[AI-03]` signed disclosure prepared for signing.

## Week 09 — S4 finish, S5 pre-share

- [ ] Internal rehearsal against a timer.
- [ ] `Activity_Worksheet.md` and answer key finalized.
- [ ] Slides ≤ 15.
- [ ] **S5 pre-share (hard deadline — end of Week 09):** push all four files to
      Moodle — `User_Guide.md`, `Demo_Screencast.mp4`, `Activity_Worksheet.md`,
      `Seminar_Slides.pptx`.
- [ ] `[AI-02]` polished to submission quality except the reflection section;
      `[AI-04]` draft outline written.

## Week 10 — Live seminar + S8 finalize

**S6 seminar (45 minutes):** 10 pitch → 10 live demo (traditional and AI
features, both live) → 20 activity → 5 Q&A. Backup recording on the laptop in
case the network dies.

**S7:** collect one minute-paper per audience team.

**S8 finalize (within 2 working days of the seminar):**

- [ ] Add the reflection section to `[AI-02]` — what AI helped with, what it
      missed, what audience Q&A revealed.
- [ ] Finish `[AI-04]` reflective statement (300 words).
- [ ] Sign `[AI-03]`.
- [ ] Submit the audit pack.

## Week 11 — Buffer

Only used if S8 slips. If everything landed in Week 10, this week is clear.
