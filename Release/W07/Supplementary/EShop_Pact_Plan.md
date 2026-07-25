# EShop Pact Integration Plan (T06 / Week 07)

## Overview

This document is the build record for **Pact** (`@pact-foundation/pact`) —
consumer-driven contract testing added to the EShop SUT. It feeds S3 milestones
**M5 (metrics)** and **M6 (contract violations)**, plus the "why contract
testing" segment of the S6 live seminar.

Pact answers a different question than Apidog does. Apidog verifies that a
running server matches an OpenAPI spec at a chosen moment. Pact verifies that
**assumptions a real frontend makes about the backend** — request shape,
headers, and the response fields the UI reads — remain valid across backend
changes, without frontend and backend having to run together. For an SUT like
EShop, whose implementation diverges from its SRS in dozens of catalogued ways
(see `EShop_Defect.md`), that distinction is the point: contract tests pin the
_lived_ contract, not the aspirational one.

**Status as of this submission: Iteration 1 complete.** One consumer
(`eshop-web`), 10 interactions, local broker-optional provider verification, and
a working CI pipeline. Iterations 2 and 3 (additional consumers, a hard
deployment gate) — described as future work in the original version of this plan
— are **not being pursued**. The reasoning is in §3.

## 1. Positioning within T06

| Track           | Item                                     | Pact's role                                                                                          |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| S1 proposal     | Third tool, alongside Apidog + Apidog AI | Justified against Spring Cloud Contract / Specmatic                                                  |
| S3 milestone M5 | Metrics                                  | Setup time, verification duration, interaction count                                                 |
| S3 milestone M6 | Contract violations                      | Primary source — the one failing interaction, cross-referenced to `EShop_Defect.md`                  |
| S4 user guide   | Screencast segment                       | "When Apidog is not enough — CDC with Pact"                                                          |
| S8 AI audit     | AI-02/03/04                              | Two AI tools in scope: Claude (documents, planning, review) and GitHub Copilot (Pact implementation) |

**What Pact adds that Apidog and Apidog AI do not.** Apidog manual mode confirms
"server matches spec today"; Apidog AI generates cases from the same spec, so it
inherits every gap the spec has. Neither notices when the backend silently
changes a field the frontend reads, as long as the spec stays in lock-step. Pact
inverts the direction — the frontend declares what it needs, and the backend
must keep proving it.

## 2. SUT inventory (Pact viewpoint)

**Provider:** `Sut/EShop/backend/` — Node.js, Express, SQLite. 31 operations
across 24 paths (`EShop_OpenApi.yaml`). `SECRET_KEY` is hard-coded and JWTs
never expire — a documented defect (`EShop_Defect.md`); Pact does not "fix" it,
and provider states deliberately do not depend on this defect.

**Consumer used:** `frontend-web` — React, `axios`. All hard-coded
`http://localhost:3000` base URLs replaced with a single `apiClient`
(`src/api/apiClient.js`), overridable via `VITE_API_BASE_URL` so a consumer test
can point at Pact's mock server.

**Constraints respected:**

- Every protected endpoint needs a valid `Authorization: Bearer <jwt>` — the
  verifier injects one via `requestFilter`, not baked into the contract.
- SQLite state isolation: the backend runs on `:memory:` when `NODE_ENV=test`,
  with a `resetDatabase()` export used by state handlers.
- SEC-06 (self-promote to admin via `PUT /api/users/me`) is a real defect.
  Provider states needing an admin token mint one directly via `jsonwebtoken`,
  not by exercising SEC-06 — this keeps the defect visible and unrelied-on.

## 3. Scope — frozen at Iteration 1

**What was built (complete):**

- Consumer: `frontend-web` only.
- 10 interactions: `POST /api/register`, `POST /api/login`, `GET /api/products`,
  `GET /api/products/:id`, `GET /api/categories`, `GET /api/users/me`,
  `PUT /api/users/me`, `GET /api/cart`, `POST /api/cart`, `POST /api/checkout`.
- Provider verifier, broker-optional (falls back to reading the local pact file
  directly when no broker URL is set — no dependency on a broker being reachable
  for local runs).
- Local broker via `docker-compose.yml`; GitHub Actions workflows for consumer
  publish and provider verify.

**What was originally planned but is explicitly not being pursued:** a second
consumer (`frontend-admin`), a third consumer (`frontend-mobile`), and promoting
`can-i-deploy` from advisory to a hard CI gate with `record-deployment` against
a simulated production environment.

**Why the scope was frozen here.** Those extensions were scheduled into Weeks
08–09, which are needed for the User Guide (20% of the seminar grade) and the S5
pre-share (a hard deadline three working days before the Week 10 seminar). One
consumer with 10 verified interactions and a working CI pipeline is sufficient
to teach and demonstrate consumer-driven contract testing for the seminar; a
second and third consumer would add infrastructure breadth without adding to the
core lesson. This also reflects that Weeks 05–06 were lost to midterm exams and
an outside commitment, leaving no schedule slack to absorb a larger scope.

## 4. Prerequisite refactors — landed

These were the smallest changes needed to make Pact testable, each as a
standalone change:

1. **`frontend-web/src/api/apiClient.js`** — single
   `axios.create({ baseURL: ... })`; every direct `axios` call in `pages/*` and
   `AuthContext.jsx` now goes through it. Enables consumer tests to redirect
   requests to the Pact mock server.
2. **`backend/server.js`** exports `app` (`module.exports = app`), guarded so
   `app.listen()` only runs when the file is executed directly — lets the
   provider verifier start its own instance on an arbitrary port.
3. **`POST /_pact/setup`** — mounted only under `NODE_ENV=test`, dispatches to
   the state-handler map. Not present in production builds.
4. **`database.js`** uses SQLite `:memory:` under `NODE_ENV=test` and exports
   `resetDatabase()`, used by every state handler.

None of these change production behaviour under normal (`NODE_ENV` unset)
operation.

## 5. Consumer side — `frontend-web`

**Layout:**

```
frontend-web/
├─ src/api/apiClient.js
├─ src/__tests__/pact/
│  ├─ pact-setup.js
│  ├─ auth.consumer.pact.test.js
│  ├─ products.consumer.pact.test.js
│  └─ cart.consumer.pact.test.js
└─ pacts/                          (generated; gitignored)
```

**Pattern** (`PactV3` from `@pact-foundation/pact`, matchers via `MatchersV3`):

```js
const { provider, M } = require('./pact-setup')
const apiClient = require('../../api/apiClient').default

describe('Products contract', () => {
    it('GET /api/products returns a list', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('a request for the product list')
            .withRequest({ method: 'GET', path: '/api/products' })
            .willRespondWith({
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: M.eachLike({
                    id: M.integer(1),
                    name: M.string('Product A'),
                    price: M.integer(100000),
                    category_id: M.integer(1),
                }),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('id')
        })
    })
})
```

**Header assertions use plain string literals, not matchers** — see §7 (FM-02).
`Content-Type: 'application/json'` above is a literal because `MatchersV3.regex`
on a header crashes the underlying FFI.

**Matcher discipline** — always use `M.integer`, `M.string`, `M.eachLike` on
**body** fields. Avoid fixed literal values in body assertions; fixed values
create brittle contracts that break on cosmetic data changes and produce false
M6 hits. (This discipline was not followed for the `checkout` interaction's
`orderId` field name — see §6, which is why that interaction failed for a reason
unrelated to true contract drift.)

## 6. Result — 9/10 interactions verified

Running the consumer suite then the provider verifier: **9 of 10 interactions
verified green**; one failed.

**The failing interaction: `POST /api/checkout`.** The contract asserted a field
named `order_id`; the server returns `orderId`. This is **not a contract-drift
finding** — the OpenAPI spec (`EShop_OpenApi.yaml`) already documented `orderId`
correctly before this contract was written, so nothing changed between spec and
implementation. The contract's own expectation was incorrect, and chasing the
failure surfaced a real, separate issue: EShop is internally inconsistent about
camelCase vs snake_case for newly-created-row identifiers (`POST /api/register`
and `POST /api/products` both return `id`; `POST /api/checkout` returns
`orderId`; nearly every other field in the API is snake_case). That
inconsistency is logged as a genuine defect in `EShop_Defect.md`, under
**Response conventions**, correctly attributed to how it was found.

**Desired-shape contracts, verified correct:**

- `GET /api/users/me`'s contract excludes `password` — EShop leaks it (SEC-01);
  this is intentional, so a hypothetical future fix would make this interaction
  pass, not fail.
- `PUT /api/users/me`'s request body excludes `role` — SEC-06; same reasoning.

## 7. Failure modes logged

**FM-02** (`EShop_Failure_Modes.md`): `PactV3`'s Rust FFI crashes when
`MatchersV3.regex` is applied to a header value (`Content-Type` on responses,
`Authorization` on requests), rather than failing gracefully. Worked around by
using plain string literals on both headers. For `Authorization`, low-risk — the
literal in the contract is a placeholder, and the verifier's `requestFilter`
injects the real JWT at verification time regardless of what's recorded. For
`Content-Type`, a literal is more brittle than a regex would have been — it will
fail if the server ever appends a charset suffix.

## 8. Outstanding housekeeping (not yet resolved)

- [ ] **Confirm the `Authorization` value committed to
      `pacts/eshop-web-eshop-backend.json` is a placeholder string, not a real
      signed JWT.** The verifier's `requestFilter` means a real token isn't
      needed in the contract; if one was accidentally captured and committed,
      that is a credential leaked to version control (and to a broker, if
      published).
- [ ] **Reconsider the plain-literal `Content-Type` assertion** given the
      brittleness noted in §7 — the safer fix is dropping the header assertion
      and relying on status + body shape, rather than keeping a literal that can
      fail for cosmetic reasons.
- [ ] **`backend/database.sqlite` was committed** during the
      provider-prerequisite work. Now that `:memory:` covers test mode, this
      file should be added to `.gitignore` and removed from tracking — a binary
      DB file churns on every run and may contain test-account data.

## 9. Local broker (development only)

`Sut/EShop/pact-broker/docker-compose.yml` brings up a Postgres-backed Pact
Broker locally. This is a fallback for offline development and for anyone
reproducing the User Guide's screencast without a broker account — the verifier
works without it, reading the local pact file directly when
`PACT_BROKER_BASE_URL` is unset.

## 10. CI/CD — as built

Two GitHub Actions workflows exist: `pact-consumer-web.yml` (generate → publish
→ advisory `can-i-deploy`) and `pact-provider-backend.yml` (verify → advisory
`can-i-deploy`, triggered on push and by a broker webhook). Both `can-i-deploy`
steps are advisory (`continue-on-error`), matching the frozen scope in §3 —
promoting either to a hard gate was part of the dropped Iteration 3 and is not
planned.

## 11. Cross-references

**Reads from:** `EShop_OpenApi.yaml` (response shapes),
`EShop_Apidog_TestCases.md` (case-name overlap where relevant),
`EShop_Defect.md` (every defect referenced here traces to an entry there).

**Updates:** `EShop_Failure_Modes.md` (FM-02 added here), `EShop_Defect.md` (the
naming-convention entry added from §6), `W07_Action_Plan.md` /
`W08_Action_Plan.md` (M6 marked done; Pact scope frozen).

## 12. Seminar activity script (S6, ~7 minutes)

1. Open the broker (or the local pact file) showing `eshop-web ↔ eshop-backend`,
   currently green on 9/10 — call out the 10th and what it taught.
2. On a fresh branch, rename a response field in `backend/server.js` (e.g.
   `price` → `unitPrice` on `GET /api/products`). Commit and push.
3. Watch the provider-verify workflow fail on the Products interaction — the
   mock recorded by `frontend-web` still expects `price`.
4. Revert the rename; push again; pipeline goes green.
5. Close on the point: neither Apidog nor Apidog AI would catch this, because
   both read the spec — and the spec would have been updated in the same change.
   Pact catches it because it reads what the frontend actually needs, not what
   the spec currently says.
