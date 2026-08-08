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
(see `Material/Document/SUT-Reference/EShop_Defect.md`), that distinction is the point: contract tests pin the
_lived_ contract, not the aspirational one.

**Status as of this submission: Iterations 1, 2, and 3 complete.** Three
consumers (`eshop-web`, `eshop-admin`, and `eshop-mobile`), 40 total
interactions, local broker-optional provider verification, and consumer CI
workflows for web and admin. The confirmed provider baseline is `eshop-web`
14/17, `eshop-admin` 20/21, and `eshop-mobile` 2/2 — **36/40 total**, with four
documented provider failures. A hard deployment gate remains deferred.

## 1. Positioning within T06

| Track           | Item                                     | Pact's role                                                                                          |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| S1 proposal     | Third tool, alongside Apidog + Apidog AI | Justified against Spring Cloud Contract / Specmatic                                                  |
| S3 milestone M5 | Metrics                                  | Setup time, verification duration, interaction count                                                 |
| S3 milestone M6 | Contract violations                      | Primary source — the one failing interaction, cross-referenced to `Material/Document/SUT-Reference/EShop_Defect.md`                  |
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
never expire — a documented defect (`Material/Document/SUT-Reference/EShop_Defect.md`); Pact does not "fix" it,
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

## 3. Scope — Iterations 1–3 complete, hard gate pending

**What was built in Iteration 1 (complete):**

- Consumer: `frontend-web` only.
- 10 interactions: `POST /api/register`, `POST /api/login`, `GET /api/products`,
  `GET /api/products/:id`, `GET /api/categories`, `GET /api/users/me`,
  `PUT /api/users/me`, `GET /api/cart`, `POST /api/cart`, `POST /api/checkout`.
- Provider verifier, broker-optional (falls back to reading the local pact file
  directly when no broker URL is set — no dependency on a broker being reachable
  for local runs).
- Local broker via `docker-compose.yml`; GitHub Actions workflows for consumer
  publish and provider verify.

**What was built in Iteration 2 (complete):**

- Consumer: `frontend-admin`.
- 16 interactions covering admin login, user management, order management,
  product/category CRUD, coupon management, and CSV import.
- Consumer-side refactor to a centralized `apiClient`, matching the corrected
  `frontend-web` pattern so Pact tests exercise the same request path as the UI.
- Provider verification runs both consumers sequentially so `eshop-web` and
  `eshop-admin` results are reported separately.
- A parallel `.github/workflows/pact-consumer-admin.yml` workflow, rather than
  folding admin into the web workflow. Keeping one consumer per workflow makes
  path triggers, cache keys, broker publishing, and advisory `can-i-deploy`
  output easy to read separately.

**What was built in Iteration 3 (complete):**

- Consumer: `frontend-mobile` (`eshop-mobile`).
- 2 interactions, deliberately scoped narrowly after investigation showed 10 of
  12 mobile backend calls overlapped `frontend-web`'s existing contract coverage
  without a meaningful request/response-shape difference.
- Plain API-client extraction and Node/Jest Pact tests only. React Native
  component rendering, `jest-expo`, and Metro-specific test setup stayed out of
  scope.
- Provider verification now runs all three consumers sequentially so web, admin,
  and mobile baselines remain visible separately.

**What remains to be executed:** promoting `can-i-deploy` from advisory to a
hard CI gate with `record-deployment` against a simulated production
environment. This is still deferred and was not part of Iteration 3.

**Why Iteration 1 was prioritized first.** Iterations 2 and 3 originally risked
colliding with Weeks 08–09, which were needed for the User Guide (20% of the
seminar grade) and the S5 pre-share. The project therefore started with one
consumer and a working CI pipeline, then extended to `frontend-admin` and
`frontend-mobile` only after the core contract-testing narrative was already
stable.

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

## 6. Result — 8/10 interactions verified, confirmed stable

Running the consumer suite then the provider verifier: **10/10 consumer tests
pass; 8/10 interactions verify against the provider**, with two documented
failures. This has been re-confirmed across 5 consecutive runs with no code
changes, so it's the reproducible baseline — not a transient state.

**Decision: both failures are left in place deliberately, for the demo.**
Neither represents an actual SUT defect being tracked as open work — Failure 1's
contract could be corrected (`order_id` → `orderId`) and Failure 2's contract
could be corrected (`{ cart: [] }` → `[]`), which would bring the suite to
10/10. That fix is not being applied. The 8/10 result stands as the seminar's
demo state: two distinct, fully root-caused failure paths — a naming mismatch
and a shape mismatch — each traced to its actual cause rather than left
mysterious, which is stronger material for showing that contract testing catches
more than one class of drift.

**Failure 1 — `POST /api/checkout`.** The contract asserted a field named
`order_id`; the server returns `orderId`. This is **not a contract-drift
finding** — the OpenAPI spec (`EShop_OpenApi.yaml`) already documented `orderId`
correctly before this contract was written, so nothing changed between spec and
implementation. The contract's own expectation was incorrect, and chasing the
failure surfaced a real, separate issue: EShop is internally inconsistent about
camelCase vs snake_case for newly-created-row identifiers (`POST /api/register`
and `POST /api/products` both return `id`; `POST /api/checkout` returns
`orderId`; nearly every other field in the API is snake_case). Logged as a
genuine defect in `Material/Document/SUT-Reference/EShop_Defect.md`, under **Response conventions**.

**Failure 2 — `GET /api/cart` (shape mismatch) — root-caused, category (a), same
pattern as Failure 1.** The contract expects `M.like({ cart: [] })` — an object
wrapping the array under a `cart` key. The server (`server.js:319`,
`res.json(userCarts[userId])`) returns a bare array. The OpenAPI spec's `Cart`
schema (`type: array`) agrees with the server. Two of three artifacts are
consistent; only the contract invented a wrapper that exists nowhere in the
implementation or the spec. Unlike Failure 1, chasing this one surfaced no
secondary defect — EShop is otherwise consistent about returning collections as
bare arrays (`GET /api/products`, `GET /api/categories` do the same), so this is
a clean contract-authoring error with nothing behind it. **Not yet logged in
`Material/Document/SUT-Reference/EShop_Defect.md`, and shouldn't be** — there's no SUT defect here to log.

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

## 6a. Iteration 2 result — `frontend-admin`: 15/16 verified, confirmed stable

`frontend-admin` adds a second consumer named `eshop-admin` against the same
provider, `eshop-backend`. Its consumer suite passes **16/16** and produces a
16-interaction pact after forcing Jest to run Pact tests serially (see FM-04).

The full provider cycle was then run three consecutive times under the same
execution path. All three runs matched:

- `eshop-web`: **8/10** verified, with the same two deliberate contract-authoring
  failures documented above.
- `eshop-admin`: **15/16** verified, with one real provider failure.

**Admin failure — `PUT /api/admin/orders/:id/status`
(`canceled`→`delivered`).** The admin contract asserts the correct state-machine
behavior: an already-canceled order should reject a transition to `delivered`
with a `400` response and an error body. The provider instead returns `200` and
updates the order. Unlike the two `eshop-web` failures, this is **not** a
contract-authoring mistake; it is live provider-verification evidence of the
known terminal-state defect documented in
`Material/Document/Methodology/EShop_State_Transition_Testing.md` as `STT-A-24`.
That entry now has both source-level analysis and independent Pact verification
as corroborating evidence.

**CI status.** `frontend-admin` now has its own consumer workflow,
`.github/workflows/pact-consumer-admin.yml`, mirroring the web workflow:
install, generate pacts, publish to the broker when broker secrets are present,
then run advisory `can-i-deploy` with `continue-on-error: true`. This keeps the
hard deployment gate deferred; no consumer or provider gate has been promoted to
blocking in Iteration 2.

## 6b. Iteration 3 result — `frontend-mobile`: 2/2 verified, confirmed clean

`frontend-mobile` adds a third consumer named `eshop-mobile`. The app is an Expo
/ React Native project, but the Pact work intentionally avoided component
testing. Its direct `fetch` calls were extracted into a plain API module with an
overridable base URL, then tested under Node/Jest against Pact's mock server.

The interaction set is intentionally small:

- `POST /api/login` — asserts the mobile-specific fields read from login:
  `user.phone` and `user.shipping_address`, which `frontend-web`'s login
  contract did not need to assert.
- `PUT /api/users/me` — asserts the real mobile request shape, including the
  camelCase `shippingAddress` field the mobile app sends.

The mobile consumer suite passes **2/2**, and provider verification passes
**2/2**. Combined with the existing baselines, the current full Pact result is:

- `eshop-web`: **14/17** verified, with three documented expected failures.
- `eshop-admin`: **20/21** verified, with one documented expected failure.
- `eshop-mobile`: **2/2** verified, no provider failures.

Iteration 3 also surfaced two defects now logged in
`Material/Document/SUT-Reference/EShop_Defect.md`:

- Mobile profile update sends `shippingAddress`, while `server.js` reads
  `shipping_address`. This is the second independent shipping-address
  field-name failure found today, after the frontend-web checkout
  `shipping_address` defect.
- Mobile checkout sends
  `items: cart.length > 1 ? cart.slice(0, -1) : cart`, silently dropping the
  final cart item whenever the cart has more than one entry.

No readback Pact interaction was added for the profile-update defect. The real
mobile app does not call `GET /api/users/me`, and adding such an interaction
would be orphaned coverage — the same mistake removed earlier from the
frontend-web contract set. The profile-update Pact interaction therefore
documents the real mobile request shape; the persistence defect is documented
from source reading in `EShop_Defect.md`.

## 7. Failure modes logged

**FM-02** (`Material/Document/SUT-Reference/EShop_Failure_Modes.md`): `PactV3`'s Rust FFI crashes when
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

**FM-04** (`Material/Document/SUT-Reference/EShop_Failure_Modes.md`): parallel Jest workers can race while
writing the same Pact output file. This first appeared during `frontend-admin`
Iteration 2: all 16 consumer tests passed, but the generated pact contained only
7 interactions. Setting `maxWorkers: 1` fixed `frontend-admin`, and the same
guard was added to `frontend-web` because it had the same latent risk.

## 8. Outstanding housekeeping — all three resolved

- [x] **`Authorization` value — confirmed clean, no code change made.** Every
      interaction uses `Bearer placeholder.token.value`, never a real token.
      `pacts/` is fully gitignored and was never tracked.
- [x] **`Content-Type` header assertion — removed.** Dropped from the consumer
      interactions rather than re-pinned to a different literal; the existing
      status-code and body-shape matchers already cover what matters for the
      contract.
- [x] **`backend/database.sqlite` — untracked.** Confirmed safe first
      (`initDatabase()` seeds the DB unconditionally on first run, so
      `npm start` doesn't need a pre-existing file), then added to a new
      `Sut/EShop/backend/.gitignore` and removed from tracking. It regenerates
      locally and stays untracked — the intended steady state.

**The `apiClient`-routing finding — investigated, then implemented.** The Pact
consumer tests originally called `axios` directly against the mock server URL
rather than routing through `apiClient`, which meant the tests weren't
exercising the same code path production traffic uses. This has since been
fixed: all three consumer test files now route through `apiClient` with
`baseURL` overridden to `mock.url`, requiring
`babel-plugin-transform-vite-meta-env` so Jest can parse `import.meta.env`.
Confirmed **not** the cause of a later false-positive suite crash (see the note
below) — the routing change itself is solid and consumer tests pass 10/10 with
it in place.

**A resolved false alarm, worth keeping on record.** A status-report pass
initially found the full suite crashing at 0/10 with `PACT CRASHED` errors on
every interaction. Deeper investigation found this did not reproduce across 5
consecutive clean runs, on the untouched `main` branch, with or without the
`apiClient` routing change — it was a one-off transient failure in the Pact FFI
on a single invocation, which left a truncated pact file that then made the
provider verifier fail downstream with a misleading "Failed to parse Pact JSON"
error. No code was changed as a result; nothing was broken. This is logged as a
candidate failure mode below, since misdiagnosing an environment-level flake as
a code regression is exactly the kind of misleading tool behaviour worth
teaching.

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
still deferred and has not been built yet.

## 11. Cross-references

**Reads from:** `EShop_OpenApi.yaml` (response shapes),
`Material/Document/Apidog/EShop_Apidog_TestCases.md` (case-name overlap where relevant),
`Material/Document/SUT-Reference/EShop_Defect.md` (every defect referenced here traces to an entry there).

**Updates:** `Material/Document/SUT-Reference/EShop_Failure_Modes.md` (FM-02 added here), `Material/Document/SUT-Reference/EShop_Defect.md` (the
naming-convention entry added from §6), `Material/Document/Planning/W07_Action_Plan.md` /
`Material/Document/Planning/W08_Action_Plan.md` (M6 marked done; Iterations 2–3 marked pending, not
scheduled to a specific week yet).

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
