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
deployment gate) are **not yet executed** — they remain planned, deferred behind
S4/S5 rather than cancelled. The reasoning for the sequencing is in §3.

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

## 3. Scope — Iteration 1 complete, Iterations 2–3 pending

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

**What remains to be executed:** a second consumer (`frontend-admin`), a third
consumer (`frontend-mobile`), and promoting `can-i-deploy` from advisory to a
hard CI gate with `record-deployment` against a simulated production
environment. These are not cancelled — they're part of the original plan and
still intended — but they are not yet built, and no specific week is currently
allocated to them.

**Why Iteration 1 was prioritized first.** Iterations 2 and 3 would have
collided with Weeks 08–09, which are needed for the User Guide (20% of the
seminar grade) and the S5 pre-share (a hard deadline three working days before
the Week 10 seminar). Given Weeks 05–06 were lost to midterm exams and an
outside commitment, S4/S5 took priority over extending Pact further this cycle.
One consumer with 10 verified interactions and a working CI pipeline is already
sufficient to teach and demonstrate consumer-driven contract testing for the
seminar itself; `frontend-admin` and `frontend-mobile` remain planned follow-on
work, to be picked up as schedule allows — before the seminar if time permits,
or afterward otherwise.

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
            expect(res.data[0]).toHaveProperty('id')
        })
    })
})
```

**The tests call `axios` directly against `${mock.url}`, not through
`apiClient`.** The `apiClient` refactor is real and did consolidate production
call sites onto one `axios.create()` instance — but the Pact consumer tests
bypass it and hit the mock server with raw axios calls instead. This means the
contract tests don't exercise the same code path production traffic actually
uses. Worth fixing at some point (route the tests through `apiClient` with
`baseURL` overridden to `mock.url`), but flagged here rather than silently
corrected, since it wasn't in scope for this verification pass.

**Header assertions use plain string literals, not matchers** — see §7 (FM-02).
`Content-Type: 'application/json; charset=utf-8'` above is a literal, charset
included, because `MatchersV3.regex` on a header crashes the underlying FFI.

**Matcher discipline** — always use `M.integer`, `M.string`, `M.eachLike` on
**body** fields. Avoid fixed literal values in body assertions; fixed values
create brittle contracts that break on cosmetic data changes and produce false
M6 hits. (This discipline was not followed for the `checkout` interaction's
`orderId` field name — see §6, which is why that interaction failed for a reason
unrelated to true contract drift.)

## 6. Result — 8/10 interactions verified

Running the consumer suite then the provider verifier: **8 of 10 interactions
verified green**; two failed. Both failures are contract-authoring errors
(consumer contracts asserting a shape that never matched the server or the
OpenAPI spec), not contract-drift findings.

**Failing interaction 1: `POST /api/checkout`.** The contract asserted a field
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

**Failing interaction 2: `GET /api/cart`.** The contract asserted a body shape
of `{ cart: [] }` (object with a `cart` key holding the items); the server
returns a bare array `[]`, and the OpenAPI spec's `Cart` schema is
`type: array` — so the server matches the spec, and the contract was authored
against an imagined wrapper that never existed. Same category as the checkout
failure: a contract-side mistake, not implementation drift. Unlike the checkout
case, this one does not surface a hidden defect — the API is uniform about
returning collections as bare arrays (`GET /api/products`, `GET /api/categories`
do the same). Left as-is deliberately, so §6 documents a second real
contract-vs-spec authoring hit and the seminar has two failure paths to walk
through (naming inconsistency vs shape mismatch), rather than being silently
"fixed" by rewriting the contract to `M.like([])`.

**A limitation of the desired-shape contracts, stated honestly:** both
`GET /api/users/me` (excluding `password`) and `PUT /api/users/me` (excluding
`role`) are currently among the 8 green — meaning Pact's `eachLike` matcher only
checks that the _expected_ fields are present with the right shape; it does not
fail on _extra_, unlisted fields being present in the response. So these two
contracts document the intended shape correctly, but they are not actually
catching SEC-01 or SEC-06 as regressions right now — a fix to either defect
would make the interaction pass (as intended), but so would leaving the defect
exactly as it is, since the contract never asserted the field's _absence_. If
closed-shape enforcement matters for the seminar's narrative, that needs an
explicit "field must not be present" assertion, which is a different mechanism
than `eachLike` provides.

**Desired-shape contracts, verified correct:**

- `GET /api/users/me`'s contract excludes `password` — EShop leaks it (SEC-01);
  this is intentional, so a hypothetical future fix would make this interaction
  pass, not fail.
- `PUT /api/users/me`'s request body excludes `role` — SEC-06; same reasoning.

## 7. Failure modes logged

**FM-02** (`EShop_Failure_Modes.md`): `PactV3`'s Rust FFI crashes when
`MatchersV3.regex` is applied to a header value (`Content-Type` on responses,
`Authorization` on requests), rather than failing gracefully. Worked around by
using plain string literals on both headers. For `Authorization`, confirmed
low-risk — the literal in the contract is `Bearer placeholder.token.value`,
never a real token, and the verifier's `requestFilter` injects the real JWT at
verification time regardless of what's recorded. For `Content-Type`, the literal
(`'application/json; charset=utf-8'`, charset included) is brittle in the
direction of the charset ever being _dropped or changed_ by the server — not
appended, as an earlier version of this document stated before the discrepancy
was caught during a read-only verification pass.

## 8. Outstanding housekeeping — verified status (as of Claude Code's read-only pass)

- [x] **`Authorization` value — confirmed clean, no action needed.** Every
      interaction in the local pact file uses `Bearer placeholder.token.value`,
      one distinct literal across all interactions — not a real JWT. `pacts/` is
      fully gitignored (`frontend-web/.gitignore:27`) and `git ls-files`
      confirms the pact file was never tracked. This item is closed.
- [ ] **The `Content-Type` literal is genuinely brittle, but in the opposite
      direction from how this document originally described it.** The literal
      already includes the charset (`'application/json; charset=utf-8'`), so it
      does not break if a charset gets _appended_ — it breaks if the charset is
      ever _dropped or changed_. The fix is the same either way: drop the header
      assertion and rely on status + body shape rather than pin an
      environment-dependent string.
- [ ] **`backend/database.sqlite` is confirmed tracked** — 36 KB binary, and
      there is no `.gitignore` at all inside `Sut/EShop/backend/` (only a
      repo-root one, which doesn't cover this path). Needs a new `.gitignore`
      entry there plus `git rm --cached`. Before removing it: confirm whether
      `npm start` outside `NODE_ENV=test` expects this file to pre-exist —
      verification runs on `:memory:` so Pact itself is unaffected, but normal
      local development might not be.

**A new finding, not originally in this list:** the Pact consumer tests call
`axios` directly against the mock server URL rather than routing through
`apiClient` (see §5). Not a housekeeping blocker, but worth deciding whether to
fix — flagged for a decision, not yet actioned.

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
steps are advisory (`continue-on-error`) — promoting either to a hard gate is
part of the still-pending Iteration 3 and has not been built yet.

## 11. Cross-references

**Reads from:** `EShop_OpenApi.yaml` (response shapes),
`EShop_Apidog_TestCases.md` (case-name overlap where relevant),
`EShop_Defect.md` (every defect referenced here traces to an entry there).

**Updates:** `EShop_Failure_Modes.md` (FM-02 added here), `EShop_Defect.md` (the
naming-convention entry added from §6), `W07_Action_Plan.md` /
`W08_Action_Plan.md` (M6 marked done; Iterations 2–3 marked pending, not
scheduled to a specific week yet).

## 12. Seminar activity script (S6, ~7 minutes)

1. Open the broker (or the local pact file) showing `eshop-web ↔ eshop-backend`,
   currently green on 8/10 — call out the 2 failing interactions and what each
   taught (checkout `orderId` naming inconsistency, cart shape mismatch).
2. On a fresh branch, rename a response field in `backend/server.js` (e.g.
   `price` → `unitPrice` on `GET /api/products`). Commit and push.
3. Watch the provider-verify workflow fail on the Products interaction — the
   mock recorded by `frontend-web` still expects `price`.
4. Revert the rename; push again; pipeline goes green.
5. Close on the point: neither Apidog nor Apidog AI would catch this, because
   both read the spec — and the spec would have been updated in the same change.
   Pact catches it because it reads what the frontend actually needs, not what
   the spec currently says.
