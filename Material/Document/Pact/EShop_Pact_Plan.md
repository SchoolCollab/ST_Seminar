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
(see `Material/Document/SUT-Reference/EShop_Defect.md`), that distinction is the
point: contract tests pin the _lived_ contract, not the aspirational one.

**Status as of this submission: Iterations 1, 2, and 3 complete.** Three
consumers (`eshop-web`, `eshop-admin`, and `eshop-mobile`), local
broker-optional provider verification, and a consumer CI workflow for each of
the three consumers, each of which now fails the job for real on a Pact mismatch
(see §10). A hard deployment gate (`can-i-deploy` as a blocking check) remains
deferred.

## 1. Positioning within T06

| Track           | Item                                     | Pact's role                                                                                                         |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| S1 proposal     | Third tool, alongside Apidog + Apidog AI | Justified against Spring Cloud Contract / Specmatic                                                                 |
| S3 milestone M5 | Metrics                                  | Setup time, verification duration, interaction count                                                                |
| S3 milestone M6 | Contract violations                      | Primary source — 51 interactions across three consumers, with five named provider-verification failures cross-referenced to `Material/Document/SUT-Reference/EShop_Defect.md` |
| S4 user guide   | Screencast segment                       | "When Apidog is not enough — CDC with Pact"                                                                         |
| S8 AI audit     | AI-02/03/04                              | Two AI tools in scope: Claude (documents, planning, review) and GitHub Copilot (Pact implementation)                |

**What Pact adds that Apidog and Apidog AI do not.** Apidog manual mode confirms
"server matches spec today"; Apidog AI generates cases from the same spec, so it
inherits every gap the spec has. Neither notices when the backend silently
changes a field the frontend reads, as long as the spec stays in lock-step. Pact
inverts the direction — the frontend declares what it needs, and the backend
must keep proving it.

## 2. SUT inventory (Pact viewpoint)

**Provider:** `Sut/EShop/backend/` — Node.js, Express, SQLite. 31 operations
across 24 paths (`EShop_OpenApi.yaml`). `SECRET_KEY` is hard-coded and JWTs
never expire — a documented defect
(`Material/Document/SUT-Reference/EShop_Defect.md`); Pact does not "fix" it, and
provider states deliberately do not depend on this defect.

**Consumers covered:** `frontend-web` (React/Vite), `frontend-admin`
(React/Vite), and `frontend-mobile` (Expo/React Native, tested only through an
extracted plain JS API module). The two web-stack apps route API traffic through
centralized `axios.create()` clients in `src/api/apiClient.js`, overridable via
`VITE_API_BASE_URL`. The mobile app routes API traffic through
`src/api/apiClient.js`, a fetch-based module overridable via
`MOBILE_API_BASE_URL`.

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

- Consumer: `frontend-web`.
- Current corrected scope: 17 interactions. The original 10-interaction set was
  later audited against real `frontend-web` call sites; orphaned `GET
  /api/categories`, `GET /api/cart`, and `POST /api/cart` interactions were
  removed, checkout/product-search fidelity was corrected, and missing
  password-reset, coupon, order-history, order-cancel, and checkout evidence
  interactions were added.
- Provider verifier, broker-optional (falls back to reading the local pact file
  directly when no broker URL is set — no dependency on a broker being reachable
  for local runs).
- Local broker via `docker-compose.yml`; GitHub Actions workflows for consumer
  publish and provider verify.

**What was built in Iteration 2 (complete):**

- Consumer: `frontend-admin`.
- Current corrected scope: 21 interactions covering admin login, user management, order management,
  product/category CRUD, coupon management, and CSV import.
- Consumer-side refactor to a centralized `apiClient`, matching the corrected
  `frontend-web` pattern so Pact tests exercise the same request path as the UI.
- At that stage, provider verification ran both web and admin sequentially so
  `eshop-web` and `eshop-admin` results were reported separately. The current
  verifier now runs all three consumers sequentially.
- A parallel `.github/workflows/pact-consumer-admin.yml` workflow, rather than
  folding admin into the web workflow. Keeping one consumer per workflow makes
  path triggers, cache keys, broker publishing, and advisory `can-i-deploy`
  output easy to read separately.

**What was built in Iteration 3 (complete):**

- Consumer: `frontend-mobile` (`eshop-mobile`).
- 13 interactions across five areas: auth/password-reset flows, login/profile,
  cart/checkout/coupon, orders, and products — see §6b for the full breakdown
  and result.
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
├─ tests/pact/
│  ├─ pact-setup.js
│  ├─ auth.consumer.pact.test.js
│  ├─ products.consumer.pact.test.js
│  ├─ orders.consumer.pact.test.js
│  └─ cart.consumer.pact.test.js
└─ pacts/                          (generated; gitignored)
```

**Pattern** (`PactV3` from `@pact-foundation/pact`, matchers via `MatchersV3`):

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
            expect(res.data[0]).toHaveProperty('id')
        })
    })
})
```

**The tests route through `apiClient`, not raw `axios`.** Each interaction points
`apiClient.defaults.baseURL` at Pact's mock server before sending the request.
This was corrected after the original frontend-web implementation, so the
consumer tests now exercise the same request path production traffic uses.

**Header assertions avoid regex matchers** — see §7 (FM-02). Interactions focus
on method, path, auth where needed, status, and body shape. Header regex
matchers are not used because `MatchersV3.regex` on a header crashes the
underlying FFI.

**Matcher discipline** — always use `M.integer`, `M.string`, `M.eachLike` on
**body** fields. Avoid fixed literal values in body assertions; fixed values
create brittle contracts that break on cosmetic data changes and produce false
M6 hits. (This discipline was not followed for the `checkout` interaction's
`orderId` field name — see §6, which is why that interaction failed for a reason
unrelated to true contract drift.)

## 6. Current frontend-web result — 14/17 verified, three documented failures

The `frontend-web` contract set was rebuilt after a call-site audit. The current
consumer suite passes **17/17** and provider verification passes **14/17**. This
supersedes the earlier 10-interaction / 8-of-10 baseline: orphaned cart/category
interactions were removed, real `?search=` product-list behavior was added, the
checkout request body was corrected to match `Checkout.jsx`, and missing
password-reset, coupon, order-history, order-cancel, and checkout evidence
interactions were added.

**Failure 1 — `POST /api/checkout` response id casing.** The contract asserts
the consumer-facing desired response field `order_id`; the server returns
`orderId`. Chasing the original failure surfaced a real response-convention
defect: EShop is internally inconsistent about camelCase vs snake_case for
newly-created-row identifiers (`POST /api/register` and `POST /api/products`
return `id`; `POST /api/checkout` returns `orderId`; most other fields are
snake_case). Logged in `Material/Document/SUT-Reference/EShop_Defect.md` under
**Response conventions**.

**Failure 2 — checkout `shipping_address` persistence evidence.** The corrected
contract request body matches the real frontend payload:
`{ items, total_amount, coupon_id }`. `server.js` destructures
`shipping_address` from that body, so a real checkout persists a null/undefined
shipping address. The evidence interaction creates an order through the real
checkout code path and then reads it back via `GET /api/orders/:id`, asserting
the correct intended stored value rather than the buggy null result.

**Failure 3 — `POST /api/apply-coupon` percent formula.** The checkout UI reads
`discount_amount` and `final_amount`; the contract asserts the correct 10%
discount for `SAVE10`. The provider computes
`discount_amount = total_amount * (1 - discount_value)`, which produces the
wrong value. This corroborates an already-known coupon defect documented in
`Material/Document/SUT-Reference/EShop_Defect.md`.

**A limitation of the desired-shape contracts, stated honestly:** Pact matchers
check that expected fields are present with the right shape; they do not fail on
extra, unlisted response fields unless the test adds an explicit negative
assertion. For example, the web `GET /api/users/me` contract does not prove the
password leak is fixed; that defect remains documented separately in
`EShop_Defect.md`.

## 6a. Iteration 2 result — `frontend-admin`: 20/21 verified, confirmed stable

`frontend-admin` adds a second consumer named `eshop-admin` against the same
provider, `eshop-backend`. Its current consumer suite passes **21/21** and
provider verification passes **20/21**. The original 16-interaction admin set
was later expanded with five real UI-triggered order-status transitions from
`Material/Document/Methodology/EShop_State_Transition_Testing.md`
(`STT-A-01`, `STT-A-05`, `STT-A-08`, `STT-A-10`, `STT-A-14`); all five pass
against the provider.

**Admin failure — `PUT /api/admin/orders/:id/status` (`canceled`→`delivered`).**
The admin contract asserts the correct state-machine behavior: an
already-canceled order should reject a transition to `delivered` with a `400`
response and an error body. The provider instead returns `200` and updates the
order. This is live provider-verification evidence of the known terminal-state
defect documented in
`Material/Document/Methodology/EShop_State_Transition_Testing.md` as `STT-A-24`.
That entry now has both source-level analysis and independent Pact verification
as corroborating evidence.

**CI status.** `frontend-admin` has its own consumer workflow,
`.github/workflows/pact-consumer-admin.yml`, mirroring the web workflow:
install, generate pacts, install the backend, then verify this consumer's
contract directly against the provider in the same job
(`PACT_VERIFY_ONLY=eshop-admin`). That verification step is now a hard gate — a
failing interaction fails the job (`continue-on-error` was removed from it; see
§10). Broker publishing and `can-i-deploy` remain present but inert, since no
broker secrets are configured; `can-i-deploy` itself stays advisory
(`continue-on-error: true`) by design, independent of the broker question.

## 6b. Iteration 3 result — `frontend-mobile`: 12/13 verified, one confirmed defect

`frontend-mobile` adds a third consumer named `eshop-mobile`. The app is an Expo
/ React Native project, but the Pact work intentionally avoided component
testing. Its direct `fetch` calls were extracted into a plain API module with an
overridable base URL, then tested under Node/Jest against Pact's mock server.

The consumer suite grew past its original 2-interaction MVP into 13
interactions across five test files, grouped by area:

- `auth-flows.consumer.pact.test.js` (3) — `POST /api/register`,
  `POST /api/forgot-password`, `POST /api/reset-password`.
- `auth-profile.consumer.pact.test.js` (2) — `POST /api/login` (asserting the
  mobile-specific fields it reads that `frontend-web`'s login contract doesn't
  need: `user.phone` and `user.shipping_address`), and `PUT /api/users/me`
  (asserting the real mobile request shape, including the camelCase
  `shippingAddress` field the mobile app sends).
- `cart-checkout.consumer.pact.test.js` (3) — `POST /api/apply-coupon`,
  `POST /api/checkout`, `POST /api/coupon-usage`.
- `orders.consumer.pact.test.js` (2) — `GET /api/orders/my-orders`,
  `PUT /api/orders/:id/cancel`.
- `products.consumer.pact.test.js` (3) — `GET /api/products` (empty search),
  `GET /api/products?search=` (a term), `GET /api/products/:id`.

The mobile consumer suite passes **13/13**, and provider verification passes
**12/13**. Combined with the existing baselines, the current full Pact result
is:

- `eshop-web`: **14/17** verified, with three documented expected failures.
- `eshop-admin`: **20/21** verified, with one documented expected failure.
- `eshop-mobile`: **12/13** verified, with one documented expected failure.

**Mobile failure — `POST /api/apply-coupon`.** Same root cause as the
`frontend-web` apply-coupon failure and the coupon percent-formula defect
already logged in `Material/Document/SUT-Reference/EShop_Defect.md` (§Coupons):
`server.js` computes `discount_amount = Math.floor(total_amount * (1 -
coupon.discount_value))`, which is the inverse of the intended discount, not a
contract-authoring mistake on the mobile side. This is live provider-verification
evidence of the same defect from a second, independent consumer.

Iteration 3 also surfaced two further defects, confirmed by reading
`frontend-mobile/App.js` and `server.js` directly (not by a failing Pact
assertion — see below), logged in `Material/Document/SUT-Reference/EShop_Defect.md`:

- Mobile profile update sends `shippingAddress`, while `server.js` reads
  `shipping_address`. This is the second independent shipping-address
  field-name mismatch found, after the frontend-web checkout
  `shipping_address` defect. The `PUT /api/users/me` Pact interaction does not
  catch this: it only asserts the request shape the mobile app actually sends
  and a `200` response, not that the value round-trips correctly on a
  subsequent read — the same `eachLike`-only-checks-presence limitation noted
  in §6 for `frontend-web`.
- Mobile checkout sends `items: cart.length > 1 ? cart.slice(0, -1) : cart`,
  silently dropping the final cart item whenever the cart has more than one
  entry. The `POST /api/checkout` Pact interaction's own description notes
  this is "intentionally out of scope" — it asserts the API client's request
  shape, not `App.js`'s cart-building logic, so this defect is real but sits
  above the layer the contract test covers.

No readback Pact interaction was added for the profile-update defect. The real
mobile app does not call `GET /api/users/me`, and adding such an interaction
would be orphaned coverage — the same mistake removed earlier from the
frontend-web contract set. The profile-update Pact interaction therefore
documents the real mobile request shape; the persistence defect is documented
from source reading in `EShop_Defect.md`.

## 7. Failure modes logged

**FM-02** (`Material/Document/SUT-Reference/EShop_Failure_Modes.md`): `PactV3`'s
Rust FFI crashes when `MatchersV3.regex` is applied to a header value
(`Content-Type` on responses, `Authorization` on requests), rather than failing
gracefully. Resolved by removing response header assertions and using plain
literals only for request headers that remain relevant. For `Authorization`,
confirmed low-risk — the literal in the contract is
`Bearer placeholder.token.value`, never a real token, and the verifier's
`requestFilter` injects the real JWT at verification time regardless of what's
recorded. Response `Content-Type` assertions were later removed entirely, so the
contracts rely on status and body shape instead of header matching.

**FM-04** (`Material/Document/SUT-Reference/EShop_Failure_Modes.md`): parallel
Jest workers can race while writing the same Pact output file. This first
appeared during `frontend-admin` Iteration 2: all 16 consumer tests passed, but
the generated pact contained only 7 interactions. Setting `maxWorkers: 1` fixed
`frontend-admin`, and the same guard was added to `frontend-web` because it had
the same latent risk.

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

**The `apiClient`-routing finding — investigated, then implemented.** The early
`frontend-web` Pact consumer tests called `axios` directly against the mock
server URL rather than routing through `apiClient`, which meant the tests
weren't exercising the same code path production traffic uses. This has since
been fixed: web/admin Pact tests route through their centralized axios clients
with `baseURL` overridden to `mock.url`, and mobile Pact tests route through the
extracted fetch-based API module with `MOBILE_API_BASE_URL` overridden. The
Vite consumers use `babel-plugin-transform-vite-meta-env` so Jest can parse
`import.meta.env`.

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

Four GitHub Actions workflows exist. Each of the three consumer workflows
(`pact-consumer-web.yml`, `pact-consumer-admin.yml`, `pact-consumer-mobile.yml`)
triggers on push/PR to its own frontend directory **and** to
`Sut/EShop/backend/**` (a backend-only change must still trigger verification —
an earlier gap where it didn't has been fixed). Each job installs the consumer,
generates that consumer's pact file (`npm run test:pact`), installs the backend,
then verifies that one consumer's contract directly against the provider in the
same job/runner via `PACT_VERIFY_ONLY=<consumer>` — no broker involved, since
the pact file was just generated in the same job. **That verification step's
exit code is a hard gate**: `continue-on-error` was removed from it, so a
failing interaction now fails the job for real, instead of the earlier design
where it was masked as advisory. `provider.verify.js`'s summary output also now
explicitly names which consumer(s) failed.

`pact-provider-backend.yml` has no push/PR trigger — a bare backend push alone
never has any consumer's pact file to verify against without a broker, so a
push-triggered run there would always fail for a reason unrelated to any real
regression. It's kept as `workflow_dispatch` (manual demo trigger) and
`repository_dispatch` (for a future Pact Broker webhook, not currently
configured).

Broker publishing and `can-i-deploy` steps remain in the workflows for
completeness but are gated `if: env.PACT_BROKER_BASE_URL != ''` and currently
no-op, since no broker secrets are configured. Where `can-i-deploy` does run, it
keeps `continue-on-error: true` — that step is advisory by design, independent
of whether a broker is even present; a hard deployment gate stays out of scope.
This is a deliberate departure from an earlier "publish to broker, then verify
separately" design, which never worked because the provider's own workflow had
no consumer pact file to read — verifying inside each consumer's own job, right
after generating its pact file, is what actually closes the loop without needing
a broker at all.

## 11. Cross-references

**Reads from:** `EShop_OpenApi.yaml` (response shapes),
`Material/Document/Apidog/EShop_Apidog_TestCases.md` (case-name overlap where
relevant), `Material/Document/SUT-Reference/EShop_Defect.md` (every defect
referenced here traces to an entry there).

**Updates:** `Material/Document/SUT-Reference/EShop_Failure_Modes.md` (FM-02
through FM-05), `Material/Document/SUT-Reference/EShop_Defect.md` (Pact-surfaced
and Pact-corroborated defects), and the planning/delivery documents that now
cite the three-consumer 46/51 baseline.

## 12. Seminar activity script (S6, ~7 minutes)

1. Run the current Pact baseline: 46/51 provider interactions verified across
   `eshop-web`, `eshop-admin`, and `eshop-mobile`, with five documented failures
   visible.
2. On a fresh branch, rename a response field in `backend/server.js` (e.g.
   `price` → `unitPrice` on `GET /api/products`). Commit and push, or run the
   verifier locally for the demo.
3. Watch Products interactions fail for all three consumers — the contracts
   recorded by web, admin, and mobile still expect `price`.
4. Revert the rename; re-run verification; the system returns to the documented
   46/51 baseline.
5. Close on the point: neither Apidog nor Apidog AI would catch this if the spec
   moved with the code. Pact catches it because it reads what the frontends
   actually need, not what the spec currently says.
