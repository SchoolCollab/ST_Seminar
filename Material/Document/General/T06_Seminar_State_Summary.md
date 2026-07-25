# T06 Seminar — Full State Summary

## Purpose of this document

A portable snapshot of the entire T06 project as of Week 06 of the semester, written to be pasted into a fresh chat so a new conversation has full context without re-deriving it. Covers the course/seminar structure, tool decisions, the SUT and its defects, every deliverable produced so far, the current Apidog project state, and where to pick up next.

## Course and seminar context

**Course:** CS423 / CSC15003 — Software Testing (2026 AI-First), Software Engineering Dept., FIT @ HCMUS. Instructor: Dr. Lâm Quang Vũ.
**Student:** Huỳnh Đăng Khoa, Student ID 23127390. Group 12, group name "SoloLevelling" (working alone).
**Topic:** T06 — API & Contract Testing. Core thesis: *"test the contract, not just the response"* — interrogating whether AI reading an OpenAPI spec is sufficient for good testing, or whether it misses business rules a human catches.

**The Seminar Track workflow (S1–S8):**

| Stage | What | Status |
| --- | --- | --- |
| S1 | Tool Survey & Proposal (≤1 page) | Done — submitted |
| S2 | Instructor Approval | Assumed approved (not explicitly confirmed in this thread) |
| S3 | Deep Study on EShop (milestones M1–M6) | **In progress — this is where we are** |
| S4 | User Guide + 5–8 min screencast | Not started |
| S5 | Pre-share to Moodle (≥3 working days before seminar) | Not started |
| S6 | Live seminar (45 min: pitch/demo/activity/Q&A) | Scheduled Week 10 |
| S7 | Audience feedback | Not started |
| S8 | AI Audit pack (`[AI-02]`/`[AI-03]`/`[AI-04]`) | Drafting planned alongside S3/S4, finalized within 2 working days of S6 |

**Semester timeline:** Week 04 = weekly-report Week 01 (S1+S2 done). Week 05 = report Week 02 (no progress, urgent-deadline gap). **Week 06 (now) = report Week 03**, S3 in progress. Seminar is **Week 10**. Weekly reports (`GroupXX_YY.zip`, containing `GroupID.md`/`.pdf` + supplementary evidence) are a separate, ongoing Moodle deliverable — distinct from the S1–S8 stage plan, and required every week regardless of stage.

**Grading:** Seminar = 20% of course. User guide 20%, in-class activity 20%, depth of study 15%, live demo 15%, proposal 10%, Q&A/facilitation 10%, AI audit 10%.

## Tool stack (final, as of S1 submission)

Three first-class choices, no separate backup tool (an earlier Postman+Postbot backup was deliberately dropped):

- **Apidog (manual mode)** — traditional API testing, design-first, imports the OpenAPI spec directly.
- **Apidog AI** — AI-generated test cases from the same spec (bring-your-own-model; free with a local/free-tier model).
- **Pact** — consumer-driven contract testing, Node-native (`@pact-foundation/pact`), CI/CD-oriented. **Not yet started — planned for Week 07.**

Each was justified in the S1 proposal against real category competitors (Apidog vs Postman/Insomnia/Bruno; Apidog AI vs Postman Postbot/Keploy; Pact vs Spring Cloud Contract/Specmatic), not against each other.

## The SUT — EShop

Repo: `ttbhanh/eshop-sut` on GitHub. Node/Express + SQLite backend, `http://localhost:3000`, JWT Bearer auth (`{ id, role }` payload, **no expiry**). 31 operations across 24 paths: Authentication, Users, Products, Categories, Cart, Orders, Coupons, Admin.

**Two source-of-truth documents exist and serve different purposes:**
- The SRS (`README.md`, FR-01–FR-24, SEC-01–SEC-07) describes *intended* behaviour.
- `backend/server.js` (read directly, 572 lines) describes *actual* behaviour — and diverges from the SRS extensively. EShop has almost no input validation, several missing auth/role checks, and multiple business-logic bugs (inverted coupon-percent formula, wrong lockout math, non-transactional bulk import, etc.).

**`EShop_Defect.md`** (renamed by the student from `EShop_SUT_Quirks.md`) catalogues every confirmed divergence, each with a `server.js:line` citation. Major findings: plaintext passwords stored and leaked via `GET /api/users/me`; JWT never expires; `SECRET_KEY` hard-coded in source; a client can self-promote to admin via `PUT /api/users/me` (SEC-06) — this is the actual mechanism used to bootstrap the admin test account; no role check on any `/api/admin/*` endpoint; SQL injection on product search; `{}`+200 instead of 404 on missing products; coupon percent-discount formula is inverted (produces a *larger* final amount, not a discount); `canceled → delivered` order transition incorrectly allowed; checkout trusts client-supplied `total_amount` and never clears the cart.

## Full document inventory

All files are Markdown unless noted; all follow an established house style (Overview + prose intro before tables, bold-column comparison tables, no course-metadata header blocks except in the weekly report, no emoji).

| File | What it is |
| --- | --- |
| `Tool_Survey_Proposal.md` / `.pdf` | The S1 deliverable. Three-choice tool selection, three separate comparison matrices, no backup tool, AI disclosure. |
| `AI-03_AI_Disclosure_S1_HuynhDangKhoa.docx` | Filled official AI disclosure form (course template) for the S1 deliverable. |
| `EShop_OpenApi.yaml` | The working OpenAPI 3.0.3 spec — **implementation-truth** (built from reading `server.js`, not the SRS). 24 paths, 30 schemas, validated. Every protected/public endpoint correctly declares `security`. Includes named request-body `examples` (success + single-fault-mode invalid variants) for all 16 request-bearing endpoints, matching Apidog's dropdown-example UI. `x-apidog-status: designing` on all 31 operations for progress tracking. `info.version: 1.0.0`. |
| `EShop_OpenApi.md` | Companion doc to the YAML — endpoint index, response conventions, defect summary table, "how to use this spec" guidance (Apidog import / AI generation / Pact). |
| `EShop_Defect.md` (was `EShop_SUT_Quirks.md`) | The full defect catalogue, one entry per finding, each with a `server.js:line` citation. This is EShop's bugs — distinct from tooling failure modes below. |
| `EShop_Failure_Modes.md` | Tracks **Apidog/tooling** misbehaviour (not SUT bugs) — the required "≥3 ways the tool can mislead you" for the User Guide. Currently has FM-01 fully written up (see below); FM-02/03 are empty templates ready to fill as new issues surface. |
| `EShop_Apidog_Setup.md` | Narrative setup guide: environment, chained-token hook, four-scenario matrix concept, worked `POST /api/cart` example, multi-step scenarios (A/B/C), what's deliberately not configured. |
| `EShop_Apidog_Steps.md` | The numbered, click-by-click version of the same setup (13 steps) — import → environment → hello world → login hook → auth verification → one endpoint's four-case matrix in full detail → replicate → business-rule script assertion → three scenarios → cold-run verification → export. |
| `EShop_Apidog_TestCases.md` | Per-endpoint reference — concrete test case bodies/expected outcomes for **all 31 operations**, cross-referencing `EShop_Defect.md` wherever the "expected" result is a documented bug rather than normal behaviour. Several entries marked **(verify)** — inferred, not source-confirmed. |
| `T06_Team_Action_Plan.md` | The current stage plan — Week 06 broken into work groups (Preparation / Baseline / Automation / AI comparison / Documentation), Weeks 07–11 outlined, S1–S8 and M1–M6 reference tables, no solo-team framing (removed per request). |
| `T06_S3_Build_Guide.md`, `T06_Demo_Defense_Brief.md`, `T06_Demo_Response_Kit.md` | Earlier prep docs (defense talking points, tool comparisons, workflow/setup Q&A). **Not yet reconciled** with the no-backup, three-choice tool decision — some content (e.g. "why Postman is a good fallback") is stale and would need updating before reuse. |
| `Group12.md` / `.pdf`, `Group12_01.zip` | Weekly report for report-Week 03, per the course's separate weekly-report requirement (distinct from the S1–S8 stage plan). Zip bundles the report + supplementary evidence (proposal, AI disclosure, chat screenshots as `evidence/1.png`–`8.png`). AI Usage Notes appendix follows the course's mandatory Section 5.B format from a separate AI Usage Guidelines document. |

## Current Apidog project state (as of this point in Week 06)

- Project imported from `EShop_OpenApi.yaml`. Endpoint tree organized by tag under a module ("Default module" → "Endpoints" → 8 tag folders).
- **Environment:** single `Local` environment (a separate `Admin` environment was created, then abandoned — Apidog can only have one active at a time). Base URL is set at the **module level** (not a variable). Variables (all in the **Local Value** column): `userEmail`, `userPassword`, `bearerToken`, `adminEmail`, `adminPassword`, `adminToken`, `productId`, `orderId`. Credentials: `tester.1@example.com` / `TesterPass123!` (regular), `admin@example.com` / `AdminPass123!` (promoted via the SEC-06 role-injection flow). Earlier personal Gmail addresses were used briefly and replaced for privacy.
- **Auth mechanism (settled, after real troubleshooting):** import dialog's "For endpoints with security defined → Corresponding security scheme" default is used as-is. The environment's token variable is named `bearerToken` specifically to match Apidog's own auto-generated default for the `bearerAuth` scheme — this was the fix for a real, confirmed issue (see FM-01 below). **No folder/Root-level Auth override is configured** — it was tried as a workaround, then correctly removed once the variable rename made it redundant.
- **Login hook:** `POST /api/login`'s Post Processor is a **Store Variable** processor (not "Extract Variable" — corrected after screenshots) — Variable Scope: Environment Variables, Source: Response JSON, Extract: JSONPath, Path `$.token`, target `bearerToken`. Must be configured *before* the first send.
- **Test Cases:** Apidog has a built-in category system (Positive/Negative/Boundary/Security/Other) under each endpoint's **Test Cases** tab, which the case-naming convention across all guides now maps onto. Assertions live under a case's **Post Processors** tab via two mechanisms: the **Response validation (Contract testing)** toggle (auto schema-check against a chosen status code) and individually-added **Assertion** post-processors (Name / Target Object — `HTTP Code`, `Response Header`, etc. / comparison operator / value). A third **Script** post-processor type takes raw JS for business-rule invariants the UI can't express (e.g. `final_amount = total_amount - discount_amount`).
- **`x-apidog-status`** is set to `designing` on every operation in the YAML as a starting point, meant to be flipped to `tested` in Apidog's UI as each endpoint's four-case matrix is completed — gives a visual progress tracker.
- Checked Apidog's official OpenAPI extension docs directly: only `x-apidog-folder`, `x-apidog-status`, `x-apidog-maintainer` are real endpoint-level extensions (folder is redundant with `tags`, maintainer is irrelevant solo). No extension exists for seeding environment variables/credentials from the spec — confirmed, not guessed.

## Key resolved issue — FM-01 (documented in `EShop_Failure_Modes.md`)

On OpenAPI import, Apidog auto-binds every protected endpoint to a self-invented default token-variable name, independent of any pre-existing environment convention. If the names don't match, requests silently send an empty `Authorization` header, producing a `403` indistinguishable from a real auth bug. Root cause confirmed via Apidog's own docs: the Security Scheme "template vs. value" design is correct and intentional — the failure is narrower, in the unreconciled default-binding step specifically. **Resolution:** renamed the environment's token variable to `bearerToken` to match Apidog's default, at the root cause rather than patching around it; confirmed this survives re-import.

## Immediate next steps (picking up mid–Week 06)

Per `T06_Team_Action_Plan.md`'s work groups: Preparation and Baseline are effectively done (spec generated, environment configured, auth resolved). Remaining for this week:
1. **Automation** — build out the four-scenario Test Case matrix across the other endpoints, using `EShop_Apidog_TestCases.md` as the values reference and `EShop_Apidog_Steps.md` Step 6/6a as the mechanical how-to.
2. **AI comparison** — enable Apidog AI (bring-your-own-model), generate test cases from the same spec, build the hand-vs-AI diff table (what AI covered, missed, got wrong).
3. **Documentation and wrap** — three Apidog-specific failure modes for the User Guide (FM-01 is one; two more still needed), export/back up the project.

Deferred to Week 07: Pact setup (not started at all), M5 metrics, M6 contract violations, and starting S8 drafting.
