# EShop Apidog — Test Suite / Scenario Implementation Plan

## Status of this document

**This is a plan for the student to execute inside the Apidog desktop app.** No
AI agent in this workflow has API/CLI access to the student's live Apidog
workspace — there is no Apidog MCP server or CLI tool available in this
environment, and the two screenshots provided (New Test Scenario dialog, an
empty scenario named `aa`, a Test Suite named `a` with the Orchestration tab
open, and the Scheduled Tasks tab blocked on "No Runner has been deployed")
confirm the workspace currently has no scenarios or suites actually built out.
**Nothing below has been created in the live project** — this document only
answers the three original questions (run-all-cases, DB reset, CI/CD
integration) from real Apidog documentation, and turns them into a concrete,
orderable build list.

**Current next step (2026-08-10).** M4 Apidog AI generation is frozen at two
executed endpoint sets: `PUT /api/users/me` and `GET /api/products/{id}`. The
combined checkpoint now contains `EShop — Full Regression` with static
references to 209 endpoint test cases (163 manual + 46 AI) plus four workflow
test scenarios. The suite has been run once, producing
`Material/Config/Apidog/Report/apidog-reports-2026-08-10-00-36-09.html`, but
that report is not a clean M5 baseline: Apidog preserved the environment
variable names on re-import while clearing their Local Values, so login failed
with blank credentials and many downstream failures were cascade noise. Before
the next run, set `userEmail=test@eshop.com`, `userPassword=Test1234!`,
`adminEmail=admin@eshop.com`, and `adminPassword=Admin123!`; leave
`bearerToken`, `adminToken`, `productId`, and `orderId` blank.

The current combined checkpoint is
`Material/Config/Apidog/Checkpoint/seminar.apidog.checkpoint.2.json`. Treat it
as the latest versioned snapshot; the first suite report is import-validation
evidence, not final pass/fail evidence.

## 1. What the three screenshots actually show

| Screenshot                        | Feature                      | State                                                                                            |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| New Test Scenario dialog          | `Tests → Test Scenarios → +` | Empty form (Name, Folder, Priority, Tag, Description) — no scenario created yet                  |
| Scenario `aa`, 0 steps            | `Test Scenarios → aa`        | Created but empty — "Add Step" never used                                                        |
| Test Suite `a`, Orchestration tab | `Test Suites → a`            | Created but empty — "Add Endpoint Test Case" / "Add Test Scenario" never used, Run Mode = Serial |
| Scheduled Tasks                   | `Tests → Scheduled Tasks`    | Blocked: _"No Runner has been deployed. Please deploy a general runner to use scheduled tasks."_ |

## 2. Answering the three original questions (from real Apidog docs, verified 2026-08-09)

Sources: `docs.apidog.com/automated-tests-in-apidog-599176m0`,
`.../scheduled-tasks-603702m0`, `.../cicd-in-apidog-609698m0`,
`.../run-test-suites-via-cli-1913685m0`,
`.../run-test-scenarios-in-batch-603202m0`,
`.../installing-and-running-apidog-cli-605135m0`.

### Q1 — "Run all 31 endpoint cases at once, instead of clicking through them"

Two real mechanisms exist, and they solve different scales of the problem:

- **Batch Run (folder-level).** In the `Tests` module, click a folder in the
  left tree — the right panel lists every Test Scenario in that folder with a
  checkbox. Select several, click **Batch Run** (top-right). This runs multiple
  **Test Scenarios**, not raw per-endpoint API cases directly — so it only helps
  once endpoint cases are wrapped into scenarios (§3 below).
- **Test Suite (project-level, what `a` in the screenshot already is).** A Test
  Suite's Orchestration tab has two buttons: **Add Endpoint Test Case** and
  **Add Test Scenario** — it can bundle raw per-endpoint cases directly, no
  scenario-wrapping required. **Run Mode: Serial** (seen in the screenshot) runs
  everything in one click, in one report. This is the more direct answer to "run
  all 31 at once" — a single Test Suite with all 31 endpoints added as Endpoint
  Test Cases, Run Mode Serial, one **Run** button.

**Recommendation:** build one Test Suite (`EShop — Full Regression`) containing
all 31 endpoint cases directly, rather than routing everything through Test
Scenarios first. Keep the 4 workflow-shaped Test Scenarios (checkout flow, admin
order-status flow, etc. — already partially designed in
`EShop_Apidog_Setup.md`'s scenario matrix) as separate, additional Test
Scenarios for demoing multi-step flows, and add those to the Test Suite too via
**Add Test Scenario** so the one Suite covers everything.

### Q2 — "Reset the SUT's database between manual test runs"

**Solved with a real, verified script — no server restart needed.** A dev-only
`POST /_dev/reset-db` route was added to `server.js`, gated with
`if (process.env.NODE_ENV !== 'production')` (this app has no production
deployment, so this is available in every normal dev/demo run, but stays absent
if that ever changes). It calls the existing `resetDatabase()` in `database.js`
— the same function already used by the Pact provider's test-only `/_pact/setup`
route — which drops, recreates, and re-seeds every table to the fixed baseline.
`Sut/EShop/backend/reset-db.sh` wraps this as a one-line command:
`./reset-db.sh` (or `npm run db:reset` from `backend/`).

**Verified working**, not assumed: started the backend locally, called
`POST /_dev/reset-db` directly, got back `{"ok":true}` and confirmed via a
follow-up `GET /api/products` that the seeded baseline was intact. Run before
each manual Apidog pass (or wire it into a Test Suite/Scenario as a pre-run step
if Apidog's own pre-request scripting can invoke an arbitrary URL — not yet
confirmed, low priority since running it by hand takes one command).

The existing test-only `POST /_pact/setup` route (`NODE_ENV=test` only) is
unchanged and untouched — the new route is separate, so Pact's deliberate
test-only boundary isn't affected.

### Q3 — "Can Apidog's test-running feature integrate with CI/CD, given the `Material/Checkpoint/` exports?"

**Yes, confirmed** — via the **Apidog CLI** (`apidog-cli`, an npm package), not
via the exported project JSON files in `Material/Checkpoint/` directly. Those
checkpoint exports are project _snapshots_ for backup/review; they are not what
CI/CD consumes.

The real, documented flow:

1. Build and debug the Test Suite (or Test Scenario) in the Apidog app until it
   passes manually.
2. Open the Suite/Scenario's **CI/CD tab** (this is the fourth tab visible in
   the student's Test Suite screenshot, alongside Orchestration / Scheduled
   Tasks / Run History — not yet opened in any screenshot provided).
3. Configure environment, test data, iterations, delay.
4. Choose CI/CD provider = **Command Line** (works with any CI system, including
   GitHub Actions) or a named provider (GitHub Actions, GitLab CI/CD, Jenkins,
   Azure Pipelines, Bitbucket, CircleCI, Travis CI are all listed as directly
   supported).
5. Click **Add access token → Generate token**, then copy the generated command
   — it already contains `apidog run` with the right suite ID, `-e` environment
   id, `-d` test-data id, etc.
6. Paste that command into a GitHub Actions step (`npm install -g apidog-cli`
   then the copied `apidog ...` command). This gets a CLI-formatted test report
   plus an HTML report under `/apidog-reports/`.

**Batch note (real limitation, confirmed in docs):** Apidog's own FAQ states
CI/CD does **not** support running multiple Test Scenarios in one CLI command —
each needs its own command in the pipeline. **A Test Suite does not have this
limitation** — a Suite's CI/CD tab produces one command that runs the whole
Suite (all bundled endpoint cases + scenarios) in one shot. This is the concrete
reason to prefer the Test-Suite-first design in §2/Q1 over wrapping everything
in Test Scenarios only.

**Scheduled Tasks are a separate, unrelated feature** from CI/CD integration —
they require a **self-hosted Runner** (currently Beta) deployed by the student
first, which is exactly the blocker the screenshot shows ("No Runner has been
deployed"). Scheduled Tasks are for calendar-based recurring runs (e.g. nightly
regression) independent of any CI/CD trigger; they are not required to answer
Q1–Q3 and can be skipped entirely for this seminar unless the student
specifically wants a recurring-schedule demo.

## 3. Concrete build list (student executes in Apidog UI)

1. **Test Suite `EShop — Full Regression`** (rename the existing empty `a`, or
   create fresh):
    - Orchestration tab → **Add Endpoint Test Case** → select all cases across
      all 31 endpoints (per `EShop_Apidog_TestCases.md`).
    - Run Mode: **Serial** (already set in the screenshot).
    - Environment: `Local`.
2. **Test Scenarios** (rename/build out the existing empty `aa`, plus 3 more) —
   reuse the four-scenario matrix already documented in `EShop_Apidog_Setup.md`:
    - `Checkout flow` (cart → checkout → cancel-order)
    - `Admin order-status flow` (login as admin → PUT order status transitions,
      covering the STT matrix in `EShop_State_Transition_Testing.md`)
    - `Coupon apply flow` (surfaces the percent-formula defect)
    - `Auth + profile flow` (register → login → PUT /users/me role injection)
    - Add each of these four to the Test Suite via **Add Test Scenario**, so the
      one Suite run covers both raw endpoint cases and multi-step flows.
3. **CI/CD tab on the Test Suite** — configure once the Suite is built and
   passes locally; generate the access token and command; this is the artifact
   to paste into a new GitHub Actions workflow
   (`.github/workflows/apidog-suite.yml`) if the student wants Apidog itself
   gated in CI (separate from the existing Pact workflows).
4. **Done, already available (§2/Q2 above)** — run
   `Sut/EShop/backend/reset-db.sh` (or `npm run db:reset` from `backend/`)
   before each manual Apidog pass to reset the database without restarting the
   server. No further action needed.

## 4. What's still open

- The CI/CD tab's exact command format has not been seen (no screenshot of it
  yet) — the access-token generation step requires an interactive Apidog login
  and cannot be captured by an AI agent without it. Ask the student to
  screenshot the Test Suite's CI/CD tab once it exists, if a GitHub Actions
  integration is wanted.
- Whether "Run exported data" (offline CLI mode, no live Apidog account needed
  at CI time) or "Run Online Data" is preferable depends on whether the student
  wants the CI job to always reflect the latest edits made in the Apidog app
  (Online) or a frozen, versioned snapshot (Exported) — this is a judgment call
  for the student, not something to decide unilaterally here.
