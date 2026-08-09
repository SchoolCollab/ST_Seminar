# [AI-02] AI Use Audit Report — T06 Seminar

**Group:** Livens (T06). **SUT:** EShop (Node/Express/SQLite). **Scope:** Weeks
04–10 of the seminar project. **Status:** Pre-seminar draft (Week 09).
Live-seminar reflection sub-section (§4) is deliberately left as a placeholder —
it can only be filled after S6.

## 1. Scope and rules of engagement

This audit covers **two AI tools** used substantively during the project:

- **Claude (via Claude Code CLI).** Used for documentation drafting, action
  planning, cross-document consistency review, and read-only analysis of the SUT
  source and generated Pact contracts. Not used to generate code that landed in
  `Sut/EShop/backend/` beyond the small `apiClient` refactor and the Pact
  scaffolding (see §3).
- **GitHub Copilot.** Used inside the editor during the Pact iteration for
  boilerplate completion — consumer-test scaffolding, state-handler bodies,
  `docker-compose.yml` for the local broker. Not used for documentation.

Tools evaluated and **not** used substantively (worth naming so the audit is
honest about the shape of the AI dependency):

- **Apidog AI (built-in generation).** Not counted here as an AI tool _we_ used
  to build the project; it is _the object of study_ for M4 and for the seminar's
  central diff table. Its outputs are recorded in §5, not §3.
- **Ollama / any local LLM.** Not used this cycle — deliberately deferred out of
  scope, per `Material/Document/Planning/W07_Action_Plan.md`.

**Rule.** No AI-generated text goes into the User Guide unedited (auto-penalty
per S1 rubric). Verified in §3.4 below by reading the final User Guide against
source docs. **Rule.** Every AI-generated code fragment that lands in the repo
is either verified against the SUT it targets, cited back to primary sources, or
explicitly logged as unverified in this document.

## 2. Prompts used (representative sample)

Full transcripts are not committed. Representative categories of prompts, in
order of frequency:

1. **Document synthesis.** _"Read `Material/Document/Apidog/EShop_Apidog_Setup.md`, `EShop_Apidog_
   Steps.md`, `EShop*Pact_Plan.md`, and draft the User Guide's Installation
   section transcribed from them — no new claims, no filler."*
2. **Cross-document consistency review.** _"Reread `Material/Document/SUT-Reference/EShop_Defect.md` and
   `Material/Document/Apidog/EShop_Apidog_TestCases.md` — for every defect in the former, does the latter
   have a defect-demo case that pins the observed outcome?"_
3. **Code reading + expected-outcome derivation.** _"Read `backend/server. js`
   lines 322–341 and tell me, per case in the POST /api/cart matrix, what the
   server actually returns — not what the OpenAPI spec says."_
4. **Action-plan drafting.** _"Given today is Week 09 Day 1 and S5 is due
   Friday, plan the remaining tracks by kind of work, not by day, keeping full
   scope with a cut order held in reserve."_
5. **Failure-mode logging.** _"Given this observed Apidog behavior, is there
   enough evidence to log it as a numbered failure mode, or is it a candidate to
   watch?"_

Prompts asking Claude to _write code_ were rare and always followed by a
verification step (see §3.3).

## 3. What each AI tool generated, and how it was verified

### 3.1 Claude — documentation

Sections drafted with substantial Claude assistance:

- `Material/Document/Planning/W09_Action_Plan.md` — draft written by Claude after
  conversation-time context loading; edited by hand for calendar correction
  ("actually, this is Week 9") and tone.
- `Material/Document/Apidog/W09_TrackA_Execution_Brief.md` — draft written by
  Claude from a directed reading of `server.js`; every line reference in the
  brief was cross-checked against the actual file.
- `Material/Deliveries/S5_Pre-Share/User_Guide.md` — draft written by Claude from the
  source-document map in `Material/Document/Planning/W09_Action_Plan.md` §Track E. Each transcribed passage
  traces to a specific source paragraph.

**Verification steps.** For each of the above: (a) every claim about `server.js`
behavior was checked against the file at the cited line range; (b) every claim
about Apidog UI behavior was checked against `Material/Document/Apidog/EShop_Apidog_Setup.md` and
`Material/Document/Apidog/EShop_Apidog_Steps.md`; (c) every claim about the Pact runs was checked against
`Material/Document/Pact/EShop_Pact_Plan.md` §6 and §7.

### 3.2 Claude — read-only analysis

Used to answer questions like _"which endpoints have documented defects?"_ and
_"are the FM-01 and FM-02 entries internally consistent?"_ These answers were
used as inputs to human decisions, not committed as text.

### 3.3 GitHub Copilot — Pact code

Substantial Copilot involvement:

- `frontend-web/tests/pact/pact-setup.js` — boilerplate for `PactV3`
  construction, log-level config.
- Each `*.consumer.pact.test.js` — the `provider.given().uponReceiving()` chain
  skeleton and matcher usage. Every matcher chosen was verified against
  `EShop_OpenApi.yaml` response schemas.
- `Sut/EShop/pact-broker/docker-compose.yml` — Postgres + broker service
  configuration.

**Where Copilot got it wrong (and it was caught).**

- Copilot suggested `MatchersV3.regex('application/json', 'Content-Type')` on
  response headers. This triggered FM-02 — a Rust FFI crash. The suggestion was
  replaced with a plain string literal after diagnosis.
- Copilot's initial `POST /api/checkout` contract asserted `order_id`
  (snake_case, matching the rest of the API). The server returns `orderId`. This
  remains one of the five stable failures in the current 46/51 three-consumer
  Pact baseline — surfaced a real camelCase inconsistency defect in the SUT,
  logged in `Material/Document/SUT-Reference/EShop_Defect.md` under "Response
  conventions."

### 3.4 Where AI output was rejected outright

- Multiple Claude drafts of the User Guide's "Introduction" section used the
  phrase "in this comprehensive guide" and similar filler. Removed by hand.
- Claude proposed writing a failure-mode entry based on a candidate that had not
  yet been confirmed. Rejected — FM entries require observed evidence, not
  extrapolation. The FM log now includes confirmed FM-03, FM-04, and FM-05
  entries.
- Claude proposed adding a "Best Practices" section to the User Guide. Rejected
  — the S1 rubric does not ask for it, and pre-cutting scope for the sake of a
  section header is a bad habit.

## 4. Live-seminar reflection

**Placeholder — to be filled within 2 working days after S6 (per S8 deadline).**

Expected contents: which AI-assisted materials survived first contact with the
audience, whether Apidog AI generated anything unexpected during the live demo,
which questions from the audience were answered by leaning on AI-drafted docs vs
by direct source knowledge.

## 5. Notes on Apidog AI as an object of study

Apidog AI was **not** an AI tool _we used to build the seminar_; it is the
central subject of §4 of the User Guide and of M4. Its output is treated as
SUT-under-test in its own right — every generated case is diffed against the
corresponding hand-built case, and the diff itself is a seminar deliverable. See
`User_Guide.md` §4.2 and the Activity Worksheet Part 2.

## 6. Cross-references

- `[AI-03]` disclosure form — signed per member, filed with S8 submission.
- `[AI-04]` reflective statement (300 words) — draft complete except for the
  live-seminar reflection sub-section.
- Primary sources verified against: `Sut/EShop/backend/server.js`,
  `Sut/EShop/EShop_OpenApi.yaml`, `Material/Document/SUT-Reference/EShop_Defect.md`,
  `Material/Document/SUT-Reference/EShop_Failure_Modes.md`,
  `Material/Document/Apidog/EShop_Apidog_Setup.md`, `Material/Document/Apidog/EShop_Apidog_Steps.md`, `Material/Document/Apidog/EShop_Apidog_TestCases.md`,
  `Material/Document/Pact/EShop_Pact_Plan.md`.
