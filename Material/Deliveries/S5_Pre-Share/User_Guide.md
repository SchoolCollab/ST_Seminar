# User Guide — API Testing with Apidog, Apidog AI, and Pact

**System under test:** EShop (`Sut/EShop/backend`, Node.js + Express + SQLite).
**Audience:** software-testing students familiar with HTTP APIs and the basics
of black-box testing, but new to Apidog or contract testing.

> Draft state (Week 09, pre-S5). Sections 1, 2, 3, 5, 6, and 7 are ready. §4
> Advanced Usage is scaffolded — its three sub-sections (four-scenario matrix,
> AI diff table, metrics table) are filled from Tracks A/B/C during Week 09
> execution.

## 1. Introduction

This guide walks through a running example of testing the EShop REST API three
different ways, and shows what each way catches that the others don't.

**Apidog (manual).** A GUI HTTP client with an OpenAPI-aware project model,
per-endpoint test cases, and multi-step scenarios. Answers: _does the running
server match the spec today?_

**Apidog AI.** Apidog's built-in "Generate with AI" feature, which reads the
imported spec and produces test cases automatically. Answers: _how much of the
manual work can we skip when the spec is complete?_

**Pact (`@pact-foundation/pact`).** A consumer-driven contract testing
framework. Two frontend consumers (`eshop-web` and `eshop-admin`) declare — as
executable tests — the request shapes and response fields they depend on; the
backend must keep proving them. Answers: _does the backend still honor the
assumptions real clients make about it, across changes that don't touch the
spec?_

Apidog verifies "server matches spec today." Apidog AI inherits every gap the
spec has. Neither notices when the backend silently changes a field the frontend
reads, as long as the spec stays in step. Pact inverts the direction — the
client declares what it needs, and the backend must keep proving it. For an SUT
like EShop, whose implementation diverges from its SRS in dozens of catalogued
ways (see `Material/Document/SUT-Reference/EShop_Defect.md`), that distinction
is the point.

## 2. Installation

### 2.1 Prerequisites

- Node.js 18+ and npm.
- The EShop repo checked out; from the repo root, `cd Sut/EShop/backend`.
- Apidog desktop (any recent version). No account is required for the manual and
  Pact sections; §4.2 (Apidog AI) needs a hosted-LLM provider configured under
  **Organization Settings → AI Features**.

### 2.2 Bring up the backend

```bash
cd Sut/EShop/backend
npm install
npm start            # port 3000, on-disk SQLite (default dev mode)
```

Leave `NODE_ENV` **unset** for normal use. The `:memory:` code path is reserved
for Pact provider verification (see §2.4) and would wipe state between runs.

### 2.3 Set up Apidog

1. Apidog → New Project → **Import → OpenAPI / Swagger** → select
   `EShop_OpenApi.yaml`.
2. In the import dialog: leave **"For imported endpoints with security defined,
   set Auth to"** on **Corresponding security scheme**; leave the Root-folder
   global-security toggle unchecked.
3. **Manage Environments → New Environment → `Local`**. Set the module's Base
   URL row to `http://localhost:3000` (not a variable — the Base URL panel at
   the top of the environment).
4. Add environment variables in the **Local Value** column: `userEmail`,
   `userPassword`, `newUserPassword`, `adminEmail`, `adminPassword` using the
   seeded credentials `test@eshop.com` / `Test1234!` and `admin@eshop.com` /
   `Admin123!`; `bearerToken`, `productId`, `orderId`, and `resetToken` left
   blank. Keep `newUserPassword=Test1234!` for a stable full-suite run unless
   you deliberately want the reset-password success case to change the later
   login password.

The variable name `bearerToken` matters. Apidog's OpenAPI importer auto-binds
protected endpoints to a variable **of that exact name**. Renaming it to
anything else silently breaks every protected request with a 403 that looks like
an auth bug. See §6, FM-01.

After importing or re-importing a checkpoint, re-check the Local Value cells.
The suite report `apidog-reports-2026-08-10-00-36-09.html` showed that Apidog
can preserve the fields while clearing the values, causing valid login to fail
with `401` and most downstream protected requests to fail for the wrong reason.
See §6, FM-07. The current full-regression suite mitigates this during suite
runs with explicit Reset blocks between major phases, but standalone request
sends still depend on the visible `Local` values.

### 2.4 Pact prerequisites — one-time backend refactors

Landed on `main` already; listed here so you can recognize them when reading the
repo:

- `frontend-web/src/api/apiClient.js` and `frontend-admin/src/api/apiClient.js`
  — single `axios.create({ baseURL })` instances. Every Pact consumer request
  routes through the app's own client, so tests can redirect requests to the
  Pact mock server without raw `axios` calls in the test body.
- `backend/server.js` exports `app` (`module.exports = app`) and only calls
  `app.listen()` when executed directly — the provider verifier starts its own
  instance on an arbitrary port.
- `POST /_pact/setup` is mounted only when `NODE_ENV=test`, dispatching to a
  state-handler map. Not present in production.
- `backend/database.js` uses SQLite `:memory:` under `NODE_ENV=test` and exports
  `resetDatabase()`, called by every state handler.

Install the Pact tooling in the consumer:

```bash
cd frontend-web
npm install --save-dev @pact-foundation/pact
```

## 3. First Test

Two "hello world" walkthroughs — one in Apidog, one in Pact.

### 3.1 Apidog "hello world"

1. With the backend running (§2.2) and the `Local` environment active, open
   `GET /api/products` and click **Send**.
2. Expected: `200 OK`, JSON array body (may be `[]` if the DB is empty).
3. Screenshot the response tab → `Material/Evidence/M1_hello_world.png`.

### 3.2 Chained-token hook

Adds JWT auth so protected endpoints "just work" for the rest of the
walkthrough.

1. Open the positive/valid `POST /api/login` test case. Body:

    ```json
    { "email": "{{userEmail}}", "password": "{{userPassword}}" }
    ```

2. Open that test case's **Post Processors** tab → **Store Variable**:

    | Field          | Value                 |
    | -------------- | --------------------- |
    | Variable Name  | `bearerToken`         |
    | Variable Scope | Environment Variables |
    | Source         | Response JSON         |
    | Extract        | JSONPath              |
    | JSONPath       | `$.token`             |

3. **Send.** The environment panel now shows `bearerToken` populated with the
   JWT.
4. Open `GET /api/users/me` and Send. Expected: `200 OK` with a user record —
   the scheme-direct binding resolved `{{bearerToken}}` on its own, no manual
   header configured.

Do not place the Store Variable extractor on the endpoint-level login Post
Processors tab. Negative login cases inherit endpoint-level processors and can
overwrite a good token with `undefined`; this is tracked as FM-08.

Full step-by-step is in `Material/Document/Apidog/EShop_Apidog_Steps.md` (Steps
1–6).

### 3.3 Pact consumer "hello world"

The consumer test declares what the frontend needs from `GET /api/products`:

```js
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Products contract', () => {
    it('GET /api/products?search= returns products on initial load', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('an initial product-list request with empty search')
            .withRequest({
                method: 'GET',
                path: '/api/products',
                query: { search: '' },
            })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    name: M.string('iPhone 15 Pro Max'),
                    price: M.integer(30000000),
                    category_id: M.integer(1),
                }),
            })
        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products?search=')
            expect(res.status).toBe(200)
        })
    })
})
```

Run: `cd frontend-web && npm run test:pact`. The test files live under
`frontend-web/tests/pact/`, and a `pacts/*.json` file is generated. To verify
the provider honors the web and admin pact files:
`cd Sut/EShop/backend && npm run pact:verify`.

## 4. Advanced Usage

### 4.1 Four-scenario matrix on `POST /api/cart`

**Pattern.** For each endpoint, add four Test Cases mapped to Apidog's built-in
categories: **Positive** (Success), **Security** (Invalid auth), **Boundary**
(edge values), **Negative** (wrong class / not found). Every invalid case
mutates exactly one field — single-fault-mode.

_[TABLE — Positive / Security / Boundary / Negative rows with body, auth,
expected status, assertions. Grounded per
`Material/Document/Apidog/W09_TrackA_Execution_Brief.md`; two of the four are
defect-demo cases, since the SUT accepts any JSON shape on POST /api/cart.
Filled from Track A on execution.]_

### 4.2 AI diff table

Evidence files:
`Material/Config/Apidog/Checkpoint/AI/seminar.apidog.ai.checkpoint.2.json`,
`Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-18-35-24.html`, and
`Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-23-48-02.html`.
Apidog AI was run with all generation categories selected, `{{bearerToken}}` as
the credential variable, Number of Cases = Auto, and Gemini 3.5 Flash as the
hosted model. The executed `PUT /api/users/me` report ran 25 requests: 9 passed,
16 failed, 35 assertions total, 23 failed assertions, 36% pass rate. The
executed `GET /api/products/{id}` report ran 22 requests: 3 passed, 19 failed,
18 assertions total, 18 failed assertions, 13.64% pass rate.

| Endpoint                 | What the AI covered well                                                                                                                                                                                  | What it missed or blurred                                                                                                                                                                                                                                                                                                                                                                         | Human review result                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUT /api/users/me`      | Generated broad positive, negative, boundary, and security coverage, including auth failures, phone/name type cases, SQL-injection text, and a specific SEC-06 privilege-escalation case expecting `403`. | It also generated a contradictory enum-coverage case that treated `role=user` and `role=admin` as ordinary positive inputs. Several `400` validation expectations reflect ideal validation, not the permissive SUT. One "GET method" case was malformed and still sent `PUT`.                                                                                                                     | Keep the SEC-06 failure as live defect evidence: Apidog expected `403`, SUT returned `200`. Quarantine the role-enum positive case and malformed/noisy assertions before using the set as a regression suite. |
| `GET /api/products/{id}` | Generated a full 22-case endpoint set across positive, negative, and boundary classes, including malformed IDs, empty path values, zero/overflow/underflow boundaries, and simple valid IDs.              | It repeatedly expected `400`/`404` for inputs where the SUT actually returns `200`, and the valid `id=2` boundary case passed without asserting the even-id `price` string quirk. Later full-suite review also found generated titles/oracles that did not match the concrete paths Apidog executed. Several green cases had little oracle value because they asserted no meaningful body fields. | Keep this as AI-oracle review evidence: the endpoint is now generated and executed, but the raw red/green split needs human classification before being promoted into regression coverage.                    |

Takeaway: Apidog AI accelerated exploration and independently confirmed SEC-06,
but the generated tests are draft hypotheses. The pass/fail result only becomes
evidence after a human compares the generated oracle against the SRS, OpenAPI
spec, SUT source, and existing defect log.

### 4.3 Metrics table (M5)

M5 compares the testing tracks by the cost and reliability that a seminar
participant would actually feel: setup time, run time, and repeated-run
stability. M4 is frozen as two executed Apidog AI endpoint sets, so the Apidog
AI numbers below must be read at that narrow scope rather than as a full-project
AI run.

| Metric     | Apidog manual                                                                                                                                                                                                                                                                              | Apidog AI                                                                                                                                                                                      | Pact                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup time | **TODO:** measure from OpenAPI import / environment setup to first green manual request.                                                                                                                                                                                                   | **TODO:** measure provider setup + first successful generation. Recorded provider: free-plan Google/Gemini, Gemini 3.5 Flash.                                                                  | **TODO:** use the actual Pact setup/run notes if timed; otherwise mark as "not timed retrospectively" rather than estimating.                                                       |
| Run time   | **TODO:** record the final stabilized `EShop — Full Regression` report. Latest classified cleanup run: `apidog-reports-2026-08-10-15-59-56.html`, 263 HTTP requests, 109 failed requests, 282 assertions, 115 failed assertions, 58.56% passed. Classification is in `Material/Document/Apidog/EShop_Apidog_TestSuite_Classification.md`; this is not a green CI baseline yet. | `2.20s` for `PUT /api/users/me`: 25 requests, 9 passed, 16 failed, 35 assertions, 23 failed. `1.66s` for `GET /api/products/{id}`: 22 requests, 3 passed, 19 failed, 18 assertions, 18 failed. | **TODO:** record one full `run_tests.sh` duration for the three-consumer baseline: 51 interactions, 46/51 provider verification.                                                    |
| Flake rate | **TODO:** run the final Apidog Test Suite N=3 if time allows; record mismatches honestly.                                                                                                                                                                                                  | Not measured. Both AI endpoint reports were one-run evidence, useful for oracle review but not a repeated-run stability claim.                                                                 | **TODO:** if using existing evidence, note the triple-run Pact discipline already established stable named failures; otherwise run `run_tests.sh` N=3 and record `0/3`, `1/3`, etc. |

Questions to fill before this table is final:

- What exact Apidog manual setup time do you want to report?
- What exact Apidog AI setup/generation time do you want to report?
- Should Pact setup time be timed from a fresh clone, or reported as "not
  retrospectively measured" with only run time included?
- For flake rate, are we doing N=3 for all three tracks, or marking Apidog AI as
  one-run-only because these endpoint reports were recorded once each?

## 5. Troubleshooting

**Empty JWT sent as `Authorization: Bearer ` → 403 Forbidden.** Environment
token variable is not named `bearerToken`. Rename it; scheme-direct binding then
resolves it automatically. Do not add a folder-level Bearer override as a
workaround — the underlying cause is the naming mismatch (§6, FM-01).

**`PactV3` crashes during test setup, opaque Rust FFI error.** A
`MatchersV3.regex(...)` is applied to a header. Do not use regex header
matchers. Omit response header assertions unless they are essential; where a
request header must be present, use a plain literal. The verifier's
`requestFilter` injects the real JWT at verification time regardless of the
placeholder Authorization value recorded in the contract (§6, FM-02).

**`import.meta.env` breaks Jest.** The frontend uses Vite, but Jest runs under
Node with Babel. Add `babel-plugin-transform-vite-meta-env` (already present in
`frontend-web/package.json`) so Jest can transform Vite's import-meta syntax.

**Pact provider verifier fails immediately with a SQL error.** The verifier must
run with `NODE_ENV=test` so the backend switches to `:memory:` and the
`resetDatabase()` state handlers work. Without it, verification runs against the
on-disk dev DB and state contaminates between interactions.

**Provider verification passes locally but fails in CI.** Each consumer's
workflow generates and verifies its own pact file within the same job
(`PACT_VERIFY_ONLY=<consumer>`), so there's no broker or separate publish step
to go stale — confirm instead that the workflow's path filters actually include
the change you pushed (each consumer workflow triggers on its own frontend
directory **and** `Sut/EShop/backend/**`). This step is now a hard gate: a
genuinely failing interaction fails the job, it isn't masked.

**Apidog CI runs but the report is not under `Material/Config/Apidog/Report/`.**
The GitHub Actions workflow exports the CLI report inside the runner and uploads
it as the `apidog-reports` artifact, alongside `apidog-cli.log` and
`apidog-exit-code.txt`. The committed report folder is only for manually
exported local reports. If the workflow fails, download the artifact first: the
checker requires `Untested = 0.00%`, non-zero executed request/assertion counts,
and zero failed HTTP requests/assertions. The workflow uses
`APIDOG_ACCESS_TOKEN` as a GitHub Actions secret plus optional
`APIDOG_TEST_SUITE_ID` and `APIDOG_ENVIRONMENT_ID` repository variables; it does
not use `APIDOG_PROJECT_ID`.

**Apidog CI reports `403010 No project guest privilege`.** Confirm the command
matches the one generated by Apidog's Test Suite CI/CD tab:
`apidog run --access-token ... --test-suite ... -e ... -r html,cli`. A previous
workflow version passed a separate `--project` argument and failed with this
misleading permission error even though the token had been used successfully.

**Pact verifier reports a malformed pact file after a consumer crash.** Delete
the truncated pact file and rerun before concluding a code regression happened;
FM-03 documents a one-off FFI crash that looked like a real break until repeat
runs cleared it.

**Pact consumer tests pass but the generated pact has missing interactions.**
Check the generated interaction count. FM-04 documents a Jest worker race on
Pact file writes; Pact consumer suites in this repo run with `maxWorkers: 1`.

**Pact provider verification times out on a request with an empty body.** Check
whether the body assertion represents real consumer data. FM-05 documents an
empty-body `PUT /api/orders/{id}/cancel` assertion that tested no meaningful UI
dependency and produced a timeout instead of a clean mismatch.

## 6. Failure Modes

The **testing tooling itself** produced misleading results during this project.
Understanding these ahead of time is more valuable than the tools' happy-path
documentation.

### FM-01 — Apidog auto-generates a mismatched default auth variable on OpenAPI import

**What happened.** After importing `EShop_OpenApi.yaml`, every protected
endpoint's Auth tab bound to a default token variable name Apidog invents on its
own. If the environment's token variable is named anything else, the two names
diverge silently and requests send `Authorization: Bearer ` (empty), returning
`403 Forbidden` — indistinguishable from a real auth-logic bug.

**Root cause.** Apidog's OpenAPI import auto-binds each endpoint's Auth to its
own generated default variable name, with no check against the environment's
naming and no import-time warning.

**Resolution.** Rename the environment variable to `bearerToken` — Apidog's
default — rather than fight the tool. Confirm by inspecting the raw outgoing
request headers on any protected endpoint before assuming the SUT is broken.

### FM-02 — PactV3's Rust FFI crashes on regex matchers applied to headers

**What happened.** `MatchersV3.regex(...)` on `Content-Type` (response) or
`Authorization` (request) crashed the underlying FFI layer during test setup,
before the mock server received any request. Body-field matchers work fine; only
headers are affected.

**Why it's misleading.** The error surfaces from a native binary layer, not from
JavaScript — looks like an environment/installation problem rather than a narrow
tool incompatibility.

**Resolution.** Do not use regex header matchers. Response `Content-Type`
assertions were dropped entirely and the contracts rely on status + body shape.
For request headers that must be present, use plain literals. For
`Authorization`, low-risk: the contract literal is
`Bearer placeholder.token.value` (never a real token), and the verifier's
`requestFilter` injects the real JWT at verification time.

### FM-03 — A transient Pact FFI crash presented as a code regression

**What happened.** One `npm run test:pact` invocation crashed with
`PACT CRASHED` errors and truncated the pact file mid-write. The following
provider verification failed with "Failed to parse Pact JSON", which was only a
downstream symptom of the truncated file.

**Why it's misleading.** The failure appeared immediately after an `apiClient`
routing change, so the timing pointed at the wrong suspect. Reverting and
rerunning once came back green, but restoring the original code also came back
green; repeat runs showed the crash was not reproducible.

**Resolution.** No code changed. Delete the stale pact file and rerun before
treating a single unexpected Pact failure as a regression.

### FM-04 — Parallel Jest workers can race Pact file writes

**What happened.** `frontend-admin`'s first 16-test consumer suite passed, but
the generated pact file contained only 7 interactions. Parallel Jest workers had
written/merged the same consumer/provider pact file concurrently.

**Why it's misleading.** The consumer suite can still be green, and the verifier
appears to check a smaller contract rather than reporting a worker race.

**Resolution.** Set `maxWorkers: 1` in both `frontend-admin/jest.config.mjs` and
`frontend-web/jest.config.mjs`, then regenerate the pact and confirm the
interaction count before verification.

### FM-05 — Empty-body PUT assertions can cause misleading verifier timeouts

**What happened.** A `PUT /api/orders/1/cancel` interaction asserted an explicit
empty request body even though the real web UI sends no meaningful payload for
cancel. Provider verification timed out rather than failing with a clear
contract mismatch.

**Why it's misleading.** The timeout looked like a Pact/provider hang, but the
contract was really over-specified around an incidental empty body.

**Resolution.** Omit empty-body and content-type assertions for this endpoint.
Assert the consumer-visible behavior: method, path, auth, expected status, and
response shape.

### FM-06 — Apidog AI can generate useful defect evidence and contradictory oracles

**What happened.** Apidog AI's generated `PUT /api/users/me` set included a
valuable SEC-06 security case expecting `403` for `role: "admin"` and receiving
`200`, confirming a real defect. The same generated set also treated role enum
coverage as a positive case, allowing `role=admin` as if it were valid input.

**Resolution.** Treat generated cases as hypotheses, not final oracles. Keep the
SEC-06 failure as evidence, but classify or rewrite contradictory/noisy AI cases
before promoting them into regression coverage.

Later full-suite review left the AI cases unchanged and documented two more
design defects: the generated "GET method" profile-update case still sent
`PUT /api/users/me`, and several generated product-detail cases had titles or
expected classes that did not match the actual request path. These are useful
AI-review examples, but not regression-ready manual cases.

### FM-07 — Apidog checkpoint re-import can preserve environment fields but wipe Local Values

**What happened.** Re-importing the Apidog checkpoint preserved the `Local`
environment and variable names, but cleared the Local Value cells. The full
suite still ran, but valid login used blank credentials and returned `401`. Most
protected requests then cascaded into `401`, while requests using blank
`orderId`/`productId` variables produced malformed URLs such as
`/api/orders//cancel`.

**Resolution.** After every import or re-import, manually re-enter the seeded
credentials: `test@eshop.com` / `Test1234!` and `admin@eshop.com` / `Admin123!`;
set `newUserPassword=Test1234!`. Leave `bearerToken`, `productId`, `orderId`,
and `resetToken` blank so the scenario/test-case post-processors can populate
them during the run.

### FM-08 — Endpoint-level login extractors can overwrite a valid token

**What happened.** After credentials were re-entered correctly, valid login
passed but the full suite still left `bearerToken` as `undefined`. The cause was
not blank credentials; it was a `$.token` extractor attached to the
endpoint-level `POST /api/login` processors, inherited by negative login cases
whose responses contain no token.

**Resolution.** Keep `bearerToken <- $.token` only on successful login producer
cases and scenario login steps. The Normal-user section starts with a regular
login; the Admin section starts with an admin login that overwrites
`bearerToken`. Do not attach token extractors to the login endpoint itself, and
do not use the obsolete `adminToken` variable — Apidog's imported Auth binding
reads `{{bearerToken}}` only.

### FM-09 — Reset hooks can miss non-database state

**What happened.** The full-regression suite's Reset blocks returned success,
but cart data from earlier negative cart-add cases still polluted a later
`GET /api/cart` success assertion. The reset looked green, so the cart failure
initially looked like an endpoint/schema problem.

**Resolution.** `POST /_dev/reset-db` now clears both SQLite and the backend's
in-memory `userCarts` object. The latest cleanup report no longer shows the
clean cart retrieval success case failing from stale cart contents.

### FM-10 — Extra Apidog CLI project id can mimic a permission failure

**What happened.** The first GitHub Actions Apidog command passed a separate
`--project` argument. The token was valid and Apidog showed it had been used,
but CI failed before running the suite with `403010 No project guest privilege`.

**Resolution.** Follow the command generated by Apidog's Test Suite CI/CD tab:
`apidog run --access-token ... --test-suite ... -e ... -r html,cli`. The
workflow now omits `--project`/`APIDOG_PROJECT_ID`, runs the suite, uploads the
HTML report artifact, and lets the checker fail only on real execution/report
results.

## 7. References

- `Material/Document/Apidog/EShop_Apidog_Setup.md` — full Apidog runtime
  configuration.
- `Material/Document/Apidog/EShop_Apidog_Steps.md` — 14-step build recipe.
- `Material/Document/Apidog/EShop_Apidog_TestCases.md` — per-endpoint case
  matrices with the assertion shorthand.
- `Material/Document/Pact/EShop_Pact_Plan.md` — Pact build record, iteration
  scope, and the current 46/51 three-consumer verification baseline.
- `Material/Document/SUT-Reference/EShop_Failure_Modes.md` — canonical FM log.
- `Material/Document/SUT-Reference/EShop_Defect.md` — SUT defect catalogue
  (SEC-01, SEC-06, FR-07, FR-08, camelCase `orderId`, checkout
  `shipping_address`, apply-coupon formula, admin STT-A-24, `{}`-on-404, even-id
  price-type quirk).
- `Sut/EShop/EShop_OpenApi.yaml` — spec under test.
- Apidog docs: <https://docs.apidog.com/>.
- Pact docs: <https://docs.pact.io/>.
