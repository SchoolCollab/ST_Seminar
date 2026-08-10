# EShop Apidog — Test Suite / Scenario Implementation Plan

## Status of this document

**This began as a plan for the student to execute inside the Apidog desktop
app.** No AI agent in this workflow has API/CLI access to the student's live
Apidog workspace — there is no Apidog MCP server or CLI tool available in this
environment — so the live UI still has to be imported/run manually by the
student. The project checkpoint, however, now contains the suite/scenario
configuration described below.

**Current next step (2026-08-10).** M4 Apidog AI generation is frozen at two
executed endpoint sets: `PUT /api/users/me` and `GET /api/products/{id}`. The
current combined checkpoint is
`Material/Config/Apidog/Checkpoint/seminar.apidog.checkpoint.2.json`. Treat it
as the latest versioned snapshot.

The suite has been run multiple times during setup. The first exported report,
`Material/Config/Apidog/Report/apidog-reports-2026-08-10-00-36-09.html`, was not
a clean M5 baseline: Apidog preserved environment variable names on re-import
while clearing their Local Values, so login failed with blank credentials and
many downstream failures were cascade noise (FM-07). A later run after
re-entering credentials still showed `bearerToken=undefined` because the
`POST /api/login` token extractor was attached at endpoint level and negative
login cases overwrote the successful token extraction (FM-08). The newer
`apidog-reports-2026-08-10-08-23-31.html` run showed real progress: valid
customer/admin/scenario logins worked, but blank `productId`/`orderId`
substitution and obsolete admin-token wiring still left avoidable failures.
After the later suite/workflow cleanup, the latest exported run is
`Material/Config/Apidog/Report/apidog-reports-2026-08-10-15-59-56.html`: 263
HTTP requests, 109 failed requests, 282 assertions, 115 failed assertions,
58.56% passed / 41.44% failed. This is the current pre-CI checkpoint evidence:
the brittle static admin transition duplicates are no longer in the saved suite
run, the role/status transition probes now execute through Workflow setup, and
the cart retrieval success case no longer fails from stale in-memory cart state.
Remaining red results still need classification into SUT defects, expected
AI-oracle noise, and any remaining test-design issues before M5 is final.

The checkpoint has now been patched into Reset, Workflow, Auth, regular-user,
admin, and AI sections. Each Reset block restores the Apidog `Local`
environment values to the seeded defaults (`test@eshop.com` / `Test1234!`,
`admin@eshop.com` / `Admin123!`) and clears runtime variables (`bearerToken`,
`productId`, `orderId`, `resetToken`). The top-level Reset section runs
`POST /_dev/reset-db` before the rest of the suite, and additional Reset blocks
separate the major Auth / regular-user / admin / AI phases. Regular-user
sections start with a regular `POST /api/login` producer; admin sections start
with an admin login producer. Regular-token security probes against admin paths
stay in the regular-user/workflow path, so they still run under a non-admin
token.

Auth flow cases carry `resetToken` from forgot-password into reset-password, and
the reset-password success case copies `newUserPassword` into `userPassword`
after it succeeds. `adminToken` is obsolete and has been removed because
Apidog's imported Auth binding reads `{{bearerToken}}` only. Before the next
run, reset the DB, set `userEmail=test@eshop.com`, `userPassword=Test1234!`,
`newUserPassword=Test1234!`, `adminEmail=admin@eshop.com`, and
`adminPassword=Admin123!`; leave `bearerToken`, `productId`, `orderId`, and
`resetToken` blank.

Current suite grouping:

| Suite section                                 | Request/case references |
| --------------------------------------------- | ----------------------- |
| Reset                                         | 1 endpoint case         |
| Workflow                                      | 5 scenarios             |
| Reset                                         | 1 endpoint case         |
| Manual - Auth                                 | 36 endpoint cases       |
| Reset                                         | 1 endpoint case         |
| Manual - Regular user profile/product cases   | 23 endpoint cases       |
| Reset                                         | 1 endpoint case         |
| Manual - Regular user cart/order/coupon cases | 45 endpoint cases       |
| Reset                                         | 1 endpoint case         |
| Manual - Admin cases                          | 56 endpoint cases       |
| Reset                                         | 1 endpoint case         |
| AI - Regular user cases                       | 48 endpoint cases       |

Current total: 214 endpoint-case references plus 5 workflow scenario references.
The 48 AI-section endpoint references are 46 generated AI cases plus a regular
login producer and a product-list producer that supplies `productId` before the
AI product-detail cases. The current AI export contains regular-user endpoint
cases only, so separate AI Auth and AI Admin suite blocks were removed instead
of keeping empty placeholders.

Latest manual-suite design cleanup: the non-admin order-status role-check case
now runs after checkout has produced a valid pending `orderId`, and the static
admin transition negative cases were removed from the Manual Admin suite run.
The Workflow section is the current source of truth for those state-dependent
checks, including the additional `Admin order-status negative cases` scenario.
The static endpoint-case definitions may still exist in the endpoint catalogue,
but they are no longer part of the full-suite orchestration because they were
state/order dependent.

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
Scenarios first. Keep the 5 workflow-shaped Test Scenarios (checkout flow, admin
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
It now also clears the backend's in-memory `userCarts` object; that second step
matters because cart state is not stored in SQLite.
`Sut/EShop/backend/reset-db.sh` wraps this as a one-line command:
`./reset-db.sh` (or `npm run db:reset` from `backend/`).

**Verified working**, not assumed: started the backend locally, called
`POST /_dev/reset-db` directly, got back `{"ok":true}` and confirmed via a
follow-up `GET /api/products` that the seeded baseline was intact. Later
full-suite runs also confirmed why clearing `userCarts` is required: without it,
negative cart-add cases polluted the next cart-read success assertion even after
the DB reset step. Run before each manual Apidog pass, and keep it as the first
Reset block in the full suite.

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
2. **Test Scenarios** — the current checkpoint includes five Workflow
   scenarios:
    - `Checkout flow` (cart → checkout → cancel-order)
    - `Admin order-status flow` (login as admin → PUT order status transitions,
      covering the STT matrix in `EShop_State_Transition_Testing.md`)
    - `Coupon apply flow` (surfaces the percent-formula defect)
    - `Auth + profile flow` (register → login → PUT /users/me role injection)
    - `Admin order-status negative cases` (migrated static status probes with
      explicit reset/order setup)
    - Add each of these five to the Test Suite via **Add Test Scenario**, so the
      one Suite run covers both raw endpoint cases and multi-step flows.
3. **GitHub Actions integration** — `.github/workflows/apidog-suite.yml` now
   installs `apidog-cli`, starts the local backend, runs Test Suite `5021`
   (`EShop — Full Regression`) in project `1355389` against environment
   `6596143` (`Local`), seeds the required environment variables with
   `--env-var`, parses the generated HTML report, and uploads the generated
   Apidog HTML reports as workflow artifacts. Add `APIDOG_ACCESS_TOKEN` as a
   GitHub Actions repository secret before expecting this workflow to run, and
   optionally add `APIDOG_PROJECT_ID`, `APIDOG_TEST_SUITE_ID`, and
   `APIDOG_ENVIRONMENT_ID` as GitHub Actions repository variables if a future
   re-import changes those IDs.

   The CI checker is intentionally not pinned to the current failing demo
   numbers. It reads the generated report at runtime and requires: non-zero
   executed requests/assertions, `Untested` = `0.00%`, `Http Requests` failed =
   `0`, and `Assertions` failed = `0`. The current known failures are preserved
   for the live demo/report evidence, but CI treats them as failures rather than
   as an acceptable baseline.
4. **Done, already available (§2/Q2 above)** — run
   `Sut/EShop/backend/reset-db.sh` (or `npm run db:reset` from `backend/`)
   before each manual Apidog pass to reset the database without restarting the
   server. No further action needed.

## 4. What's still open

- The exact access token value still cannot be captured by an AI agent. Generate
  it in Apidog's Test Suite CI/CD tab, then store it as the GitHub Actions
  repository secret `APIDOG_ACCESS_TOKEN`.
- If the Apidog project is re-imported and receives new IDs, update the GitHub
  Actions repository variables `APIDOG_PROJECT_ID`, `APIDOG_TEST_SUITE_ID`, and
  `APIDOG_ENVIRONMENT_ID`. The workflow has fallback values from the current
  checkpoint, but repository variables are the intended future-edit point.
- Whether "Run exported data" (offline CLI mode, no live Apidog account needed
  at CI time) or "Run Online Data" is preferable depends on whether the student
  wants the CI job to always reflect the latest edits made in the Apidog app
  (Online) or a frozen, versioned snapshot (Exported). The committed workflow
  currently uses **Online Data**, matching Apidog's documented CI/CD flow and
  the suite/environment IDs exported in the current checkpoint.
