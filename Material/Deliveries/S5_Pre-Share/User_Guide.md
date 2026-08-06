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
framework. The frontend declares — as executable tests — the request shapes and
response fields it depends on; the backend must keep proving them. Answers:
_does the backend still honor the assumptions a real client makes about it,
across changes that don't touch the spec?_

Apidog verifies "server matches spec today." Apidog AI inherits every gap the
spec has. Neither notices when the backend silently changes a field the frontend
reads, as long as the spec stays in step. Pact inverts the direction — the
client declares what it needs, and the backend must keep proving it. For an SUT
like EShop, whose implementation diverges from its SRS in dozens of catalogued
ways (see `EShop_Defect.md`), that distinction is the point.

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
   `userPassword`, `adminEmail`, `adminPassword` (with your registered
   credentials); `bearerToken`, `adminToken`, `productId`, `orderId` left blank.

The variable name `bearerToken` matters. Apidog's OpenAPI importer auto-binds
protected endpoints to a variable **of that exact name**. Renaming it to
anything else silently breaks every protected request with a 403 that looks like
an auth bug. See §6, FM-01.

### 2.4 Pact prerequisites — one-time backend refactors

Landed on `main` already; listed here so you can recognize them when reading the
repo:

- `frontend-web/src/api/apiClient.js` — a single `axios.create({ baseURL })`
  instance. Every direct `axios` call in `pages/*` and `AuthContext.jsx` now
  routes through it, so consumer tests can redirect requests to the Pact mock
  server via `VITE_API_BASE_URL`.
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

1. Open `POST /api/login`. Body:

    ```json
    { "email": "{{userEmail}}", "password": "{{userPassword}}" }
    ```

2. Open the **Post Processors** tab → **Store Variable**:

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

Full step-by-step is in `EShop_Apidog_Steps.md` (Steps 1–6).

### 3.3 Pact consumer "hello world"

The consumer test declares what the frontend needs from `GET /api/products`:

```js
const { provider, M } = require('./pact-setup')
const axios = require('axios')

describe('Products contract', () => {
    it('GET /api/products returns a list', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('a request for the product list')
            .withRequest({ method: 'GET', path: '/api/products' })
            .willRespondWith({
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: M.eachLike({
                    id: M.integer(1),
                    name: M.string('Product A'),
                    price: M.integer(100000),
                    category_id: M.integer(1),
                }),
            })
        await provider.executeTest(async mock => {
            const res = await axios.get(`${mock.url}/api/products`)
            expect(res.status).toBe(200)
        })
    })
})
```

Run: `cd frontend-web && npm run test:pact`. A `pacts/*.json` file is generated.
To verify the provider honors that file:
`cd Sut/EShop/backend && npm run test:pact:verify`.

## 4. Advanced Usage

### 4.1 Four-scenario matrix on `POST /api/cart`

**Pattern.** For each endpoint, add four Test Cases mapped to Apidog's built-in
categories: **Positive** (Success), **Security** (Invalid auth), **Boundary**
(edge values), **Negative** (wrong class / not found). Every invalid case
mutates exactly one field — single-fault-mode.

_[TABLE — Positive / Security / Boundary / Negative rows with body, auth,
expected status, assertions. Grounded per `W09_TrackA_Execution_Brief.md`; two
of the four are defect-demo cases, since the SUT accepts any JSON shape on POST
/api/cart. Filled from Track A on execution.]_

### 4.2 AI diff table

_[Filled Wednesday after Track B AI generation runs. Columns: what the AI
covered well (schema shape, declared types, status codes), what it missed
(business rules absent from the spec: coupon reuse, cross-user cart access,
expired sessions), what it got wrong (assertions on non-existent fields,
invented endpoints, overconfident "valid" cases including SEC-06's `role`
field). One row per compared endpoint.]_

### 4.3 Metrics table (M5)

_[Filled Thursday after Tracks A/B/C runs recorded. Rows: setup time, run time,
flake rate (N ≥ 5 if achievable, else N = 3 noted honestly). Columns: Apidog
manual, Apidog AI, Pact.]_

## 5. Troubleshooting

**Empty JWT sent as `Authorization: Bearer ` → 403 Forbidden.** Environment
token variable is not named `bearerToken`. Rename it; scheme-direct binding then
resolves it automatically. Do not add a folder-level Bearer override as a
workaround — the underlying cause is the naming mismatch (§6, FM-01).

**`PactV3` crashes during test setup, opaque Rust FFI error.** A
`MatchersV3.regex(...)` is applied to a header. Replace with a plain string
literal on both `Content-Type` (response) and `Authorization` (request); the
verifier's `requestFilter` injects the real JWT at verification time regardless
of what's recorded in the contract (§6, FM-02).

**`import.meta.env` breaks Jest.** The frontend uses Vite, but Jest runs under
Node with Babel. Add `babel-plugin-transform-vite-meta-env` (already present in
`frontend-web/package.json`) so Jest can transform Vite's import-meta syntax.

**Pact provider verifier fails immediately with a SQL error.** The verifier must
run with `NODE_ENV=test` so the backend switches to `:memory:` and the
`resetDatabase()` state handlers work. Without it, verification runs against the
on-disk dev DB and state contaminates between interactions.

**Provider verification passes locally but fails in CI.** The verifier is
broker-optional (falls back to reading the local pact file when
`PACT_BROKER_BASE_URL` is unset). Confirm the CI job publishes the pact file
before the verify step consumes it.

**Apidog scenario shows every step green even though a middle step failed.**
Candidate for FM-03 — verify whether scenario chaining silently continues after
a failed assertion, or whether the failure actually halts downstream steps.
Flagged in `EShop_Failure_Modes.md`, "Candidates to watch."

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

**Resolution.** Use plain string literals on both headers. For `Authorization`,
low-risk: the contract literal is `Bearer placeholder.token.value` (never a real
token), and the verifier's `requestFilter` injects the real JWT at verification
time. For `Content-Type`, brittle if the server ever drops or changes the
charset — consider dropping the header assertion entirely and relying on
status + body shape.

### FM-03 — _(pending — one of two candidates below closes this slot on Wednesday)_

**Candidates.** (a) Does Apidog AI generate a "valid" case that includes `role`
in the body of `PUT /api/users/me`, i.e., validate SEC-06 as a feature? (b) Does
Apidog's schema auto-check pass on the `{}`-with-200 response from
`GET /api/products/:id` for a missing product? A third fallback (scenario
chaining continues silently after a failed step) is held in reserve if neither
AI candidate lands.

## 7. References

- `Material/Document/W07/EShop_Apidog_Setup.md` — full Apidog runtime
  configuration.
- `Material/Document/W07/EShop_Apidog_Steps.md` — 13-step build recipe.
- `Material/Document/W07/EShop_Apidog_TestCases.md` — per-endpoint case matrices
  with the assertion shorthand.
- `Material/Document/W07/EShop_Pact_Plan.md` — Pact build record, iteration
  scope, and the 8/10 verification result.
- `Material/Document/General/EShop_Failure_Modes.md` — canonical FM log.
- `Material/Document/General/EShop_Defect.md` — SUT defect catalogue (SEC-01,
  SEC-06, FR-07, FR-08, camelCase `orderId`, `{}`-on-404, even-id price-type
  quirk).
- `Sut/EShop/EShop_OpenApi.yaml` — spec under test.
- Apidog docs: <https://docs.apidog.com/>.
- Pact docs: <https://docs.pact.io/>.
