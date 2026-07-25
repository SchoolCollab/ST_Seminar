# EShop Pact Integration Plan (T06 / Week 07)

## Overview

This document is the Week 07 build plan for the third tool in the T06 tool stack — **Pact** (`@pact-foundation/pact`) — consumer-driven contract testing wired into CI/CD. It is the direct continuation of the Apidog (manual) and Apidog AI work already completed in Week 06 and is scoped to feed milestones **M5 (metrics)** and **M6 (contract violations)** of the S3 deep-study track, plus the "why contract testing" segment of the S6 live seminar.

Pact answers a different question than Apidog does. Apidog verifies that a running server matches an OpenAPI spec at a chosen moment. Pact verifies that the **assumptions each frontend actually makes about the backend** — request shape, headers, and the response fields the UI reads — remain valid across every backend change, without the frontend and backend having to be run together. For an SUT like EShop, whose implementation diverges from its SRS in dozens of catalogued ways (see [`EShop_Defect.md`](../General/EShop_Defect.md)), that distinction is the whole point: contract tests pin the *lived* contract, not the aspirational one, and fail loudly the moment a "harmless" backend refactor changes it.

The plan assumes the artifacts already produced in Week 06 as inputs: the implementation-truth OpenAPI spec ([`EShop_OpenApi.yaml`](../../Config/EShop_OpenApi.yaml)), the per-endpoint case reference ([`EShop_Apidog_TestCases.md`](./EShop_Apidog_TestCases.md)), the defect catalogue, and the tooling failure-mode log ([`EShop_Failure_Modes.md`](../General/EShop_Failure_Modes.md)) — which Pact will contribute two more entries to (FM-02, FM-03) as issues surface during implementation.

Note on source: the Claude share link provided with the request could not be retrieved (SPA content is not exposed to fetchers). This plan is written from the pasted T06 State Summary plus a direct inspection of `Sut/EShop/`. If a specific recommendation from that conversation should override anything below (e.g. PactFlow vs self-hosted broker, or a different consumer to start with), flag it and this doc will be revised.

---

## 1. Positioning within T06

**Where Pact fits in the seminar plan**

| **Track** | **Item** | **Pact's role** |
|---|---|---|
| S1 proposal | Third tool, alongside Apidog + Apidog AI | Already justified against Spring Cloud Contract / Specmatic |
| S3 milestone M5 | Metrics | Contribute broker-side metrics: interactions verified, coverage per consumer, verification duration, breakage rate on PRs |
| S3 milestone M6 | Contract violations | Primary source — every failed verification is an M6 data point, cross-referenced back to `EShop_Defect.md` |
| S4 user guide | 5–8 min screencast | Segment 3: "when Apidog is not enough — CDC with Pact" |
| S6 live seminar | In-class activity | Deliberate breaking change on backend → provider verify fails in CI → deploy blocked by `can-i-deploy` |
| S8 AI audit | AI-02/03/04 | Contrast: Pact tests are written by a human from real UI code, no AI generation, so the audit surface is limited to boilerplate scaffolding |

**What Pact adds that Apidog and Apidog AI do not.** Apidog manual mode confirms "server matches spec today"; Apidog AI generates cases from the same spec, so it inherits every gap the spec has. Neither of them notices when the backend silently drops a field the web frontend reads, as long as the spec is updated in lock-step. Pact inverts the direction — the frontend declares what it needs, and the backend must keep proving it — so drift is detected mechanically, not by remembering to keep three artifacts in sync.

---

## 2. SUT inventory (Pact viewpoint)

**Provider (single):** `Sut/EShop/backend/` — Node.js, Express 5, SQLite (`sqlite3`), JWT via `jsonwebtoken`. 31 operations across 24 paths. `SECRET_KEY` is hard-coded and JWTs never expire — convenient for tests, but explicitly a defect (see `EShop_Defect.md`), and Pact will not "fix" it. No test script exists today (`"test": "echo \"Error: no test specified\" && exit 1"`).

**Consumers (three):**

| **Consumer** | **Stack** | **HTTP client** | **Endpoints it actually touches** |
|---|---|---|---|
| `frontend-web` | React 19 + Vite | `axios`, base URL hard-coded to `http://localhost:3000` in each page | Auth, Products, Categories, Cart, Checkout, Orders (my-orders/:id/cancel), Users/me |
| `frontend-admin` | React + Vite | `axios` | `/api/admin/*`, Products CRUD, Categories CRUD, Coupons, Orders status |
| `frontend-mobile` | React Native + Expo | `axios` / `fetch` | Same public surface as web, thinner |

**Constraints Pact must respect**

- Every protected endpoint needs a valid `Authorization: Bearer <jwt>` — verifier must inject one via `requestFilter`, not bake tokens into the contract.
- SQLite is a shared on-disk file — each provider state must reset the DB (drop + reseed, or switch to `:memory:` when `NODE_ENV=test`).
- The web/admin frontends call `axios` directly from components with the URL hard-coded, so a **small refactor to a single `apiClient`** is a prerequisite for any consumer test to be able to point at Pact's mock server on a random port.
- SEC-06 (self-promote to admin via `PUT /api/users/me`) is a real defect. Provider states that need an admin token should mint one via `jsonwebtoken` directly, not by exercising SEC-06 in test setup — this keeps the defect visible and unrelied-on.

---

## 3. Scope, iterations, and success criteria

**Iteration 1 (Week 07, in-scope for the seminar demo)** — one consumer, one provider, minimum viable pipeline.

- Consumer: `frontend-web`.
- Interactions: at least the following ten, chosen to cover the "core buyer flow" plus two known-defective endpoints so M6 has real material:
  - `POST /api/register`, `POST /api/login`
  - `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`
  - `GET /api/users/me`, `PUT /api/users/me`
  - `GET /api/cart`, `POST /api/cart`, `POST /api/checkout`
- Provider: `backend` verifies pacts pulled from the broker.
- Broker: Pact Broker in Docker locally for development, **PactFlow free tier** for CI (avoids depending on a laptop being online).
- CI: two GitHub Actions workflows (consumer publish, provider verify) + a broker→provider webhook.

**Iteration 2 (Week 08)** — `frontend-admin`: `/api/admin/*`, coupons, order status transitions. Adds the second pacticipant to the broker matrix.

**Iteration 3 (Week 09)** — `frontend-mobile` + turn `can-i-deploy` into a hard gate + `record-deployment` on a fake "production" environment for the demo.

**Definition of done (Iteration 1)**

- [ ] `npm run test:pact` in `frontend-web` produces a valid pact file.
- [ ] `npm run pact:verify` in `backend` passes ≥ 10 interactions and publishes results to the broker.
- [ ] Both GitHub Actions workflows are green on a demonstration PR.
- [ ] Broker UI shows the `eshop-web ↔ eshop-backend` matrix with verified status.
- [ ] `can-i-deploy --to-environment production` returns success on `main`.
- [ ] One deliberate breaking change (rename `price` → `unitPrice` on `GET /api/products`) turns provider verification red and blocks deploy — this is the seminar activity.

---

## 4. Prerequisite refactors (before any Pact code is written)

These are the smallest changes that make Pact testable at all. Each is a standalone PR so the diff stays reviewable.

1. **Extract an `apiClient` in `frontend-web`.** New `src/api/apiClient.js` exporting a single `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000' })`. Replace every direct `axios.get('http://localhost:3000/api/...')` in `pages/*` and `context/AuthContext.jsx` with `apiClient.get('/api/...')`. This is what lets a consumer test override `apiClient.defaults.baseURL` to the Pact mock's random port.
2. **Export `app` from `backend/server.js`.** Split the current single-file `app.listen(3000)` into `module.exports = app` plus a thin `bin/www` (or a `if (require.main === module) app.listen(...)` guard) so the provider verifier can call `app.listen(0)` on its own port.
3. **Provider state hook.** Add a route that is registered **only when `process.env.NODE_ENV === 'test'`**: `POST /_pact/setup` accepting `{ state: string, params?: object }`, dispatching to the state handler map (see §6). This is the standard Pact pattern and stays out of production builds because it is guarded at boot.
4. **Test-mode DB.** Point `sqlite3` at `:memory:` when `NODE_ENV=test`; keep the existing file-backed DB otherwise. Add a small `db.reset()` / `db.seed*()` API used exclusively by state handlers.

None of these change production behaviour. All four should land before Week 07 mid-week so the rest of the plan is unblocked.

---

## 5. Consumer side — `frontend-web`

**Install**

```powershell
cd Sut/EShop/frontend-web
npm i -D @pact-foundation/pact jest @babel/preset-env @babel/preset-react babel-jest cross-env
```

**Layout**

```
frontend-web/
├─ src/api/apiClient.js
├─ src/__tests__/pact/
│  ├─ pact-setup.js
│  ├─ auth.consumer.pact.test.js
│  ├─ products.consumer.pact.test.js
│  ├─ cart.consumer.pact.test.js
│  └─ users.consumer.pact.test.js
└─ pacts/                          (generated; gitignored)
```

**`pact-setup.js`** — one `PactV3` per consumer/provider pair, matchers re-exported for convenience.

```js
const path = require('path');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const provider = new PactV3({
  consumer: 'eshop-web',
  provider: 'eshop-backend',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});
module.exports = { provider, M: MatchersV3 };
```

**Example — `products.consumer.pact.test.js`**

```js
const { provider, M } = require('./pact-setup');
const apiClient = require('../../api/apiClient').default;

describe('Products contract', () => {
  it('GET /api/products returns a list', async () => {
    provider
      .given('at least one product exists')
      .uponReceiving('a request for the product list')
      .withRequest({ method: 'GET', path: '/api/products' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': M.regex(/application\/json.*/, 'application/json') },
        body: M.eachLike({
          id: M.integer(1),
          name: M.string('Product A'),
          price: M.integer(100000),
          category_id: M.integer(1),
        }),
      });

    await provider.executeTest(async (mock) => {
      apiClient.defaults.baseURL = mock.url;
      const res = await apiClient.get('/api/products');
      expect(res.status).toBe(200);
      expect(res.data[0]).toHaveProperty('id');
    });
  });
});
```

**Interactions to author in Iteration 1**

| **File** | **Interaction** | **Provider state** | **Cross-ref** |
|---|---|---|---|
| `auth` | `POST /api/register` 200 | `email not registered` | Positive |
| `auth` | `POST /api/login` 200 | `user tester.1@example.com exists` | Positive |
| `products` | `GET /api/products` 200 | `at least one product exists` | Positive |
| `products` | `GET /api/products/:id` 200 | `product 1 exists` | Defect: missing returns `{}`+200, contract locks in 404 (M6) |
| `products` | `GET /api/categories` 200 | `default categories exist` | Positive |
| `users` | `GET /api/users/me` 200 | `authenticated as tester.1` | Contract must exclude `password` field (defect: it leaks) |
| `users` | `PUT /api/users/me` 200 | `authenticated as tester.1` | Contract must not include `role` (defect: SEC-06) |
| `cart` | `GET /api/cart` 200 | `authenticated user has empty cart` | Positive |
| `cart` | `POST /api/cart` 200 | `authenticated user, product 1 exists` | Positive |
| `checkout` | `POST /api/checkout` 200 | `authenticated user has 1 item worth 100000` | Contract locks `final_amount` shape (defect: server trusts client total) |

**Matcher discipline** — always use `M.integer`, `M.string`, `M.eachLike`, `M.regex`. Avoid fixed values in the response body. Fixed values create brittle contracts that break on cosmetic data changes and produce false M6 hits.

**Scripts**

```jsonc
// frontend-web/package.json
"scripts": {
  "test:pact":    "cross-env NODE_ENV=test jest --testMatch=\"**/__tests__/pact/**/*.pact.test.js\"",
  "pact:publish": "pact-broker publish ./pacts --consumer-app-version=$env:GIT_SHA --branch=$env:GIT_BRANCH --broker-base-url=$env:PACT_BROKER_BASE_URL --broker-token=$env:PACT_BROKER_TOKEN"
}
```

---

## 6. Provider side — `backend`

**Install**

```powershell
cd Sut/EShop/backend
npm i -D @pact-foundation/pact jest cross-env
```

**`pact/states/stateHandlers.js`** — one handler per state name used by any consumer. Each handler resets the DB first.

```js
const jwt = require('jsonwebtoken');
const db = require('../database');
const SECRET = process.env.SECRET_KEY || 'dev-secret';   // matches server.js

async function seedTester() {
  await db.reset();
  const id = await db.insertUser({
    email: 'tester.1@example.com',
    password: 'TesterPass123!',
    name: 'Tester One',
    role: 'user',
  });
  return jwt.sign({ id, role: 'user' }, SECRET);
}

module.exports = {
  'email not registered':                async () => { await db.reset(); },
  'user tester.1@example.com exists':    async () => { await seedTester(); },
  'at least one product exists':         async () => { await db.reset(); await db.seedProducts([{ id:1, name:'Product A', price:100000, category_id:1 }]); },
  'product 1 exists':                    async () => { await db.reset(); await db.seedProducts([{ id:1, name:'Product A', price:100000, category_id:1 }]); },
  'default categories exist':            async () => { await db.reset(); await db.seedCategories([{ id:1, name:'General' }]); },
  'authenticated as tester.1':           async () => ({ token: await seedTester() }),
  'authenticated user has empty cart':   async () => ({ token: await seedTester() }),
  'authenticated user, product 1 exists':async () => {
    const token = await seedTester();
    await db.seedProducts([{ id:1, name:'Product A', price:100000, category_id:1 }]);
    return { token };
  },
  'authenticated user has 1 item worth 100000': async () => {
    const token = await seedTester();
    await db.seedProducts([{ id:1, name:'Product A', price:100000, category_id:1 }]);
    await db.seedCartFor('tester.1@example.com', [{ product_id:1, quantity:1 }]);
    return { token };
  },
};
```

**`pact/provider.verify.js`**

```js
const { Verifier } = require('@pact-foundation/pact');
const app = require('../server');
const stateHandlers = require('./states/stateHandlers');

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  let stateToken = null;

  try {
    await new Verifier({
      provider: 'eshop-backend',
      providerBaseUrl: `http://localhost:${port}`,
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA,
      providerVersionBranch: process.env.GIT_BRANCH,
      consumerVersionSelectors: [{ mainBranch: true }, { deployedOrReleased: true }],
      stateHandlers: Object.fromEntries(
        Object.entries(stateHandlers).map(([name, fn]) => [name, async () => {
          const res = await fn();
          stateToken = res?.token ?? null;
        }]),
      ),
      requestFilter: (req, _res, next) => {
        if (stateToken) req.headers['authorization'] = `Bearer ${stateToken}`;
        next();
      },
    }).verifyProvider();
  } finally {
    server.close();
  }
})();
```

**Scripts**

```jsonc
"scripts": {
  "start":       "node server.js",
  "pact:verify": "cross-env NODE_ENV=test node pact/provider.verify.js"
}
```

---

## 7. Pact Broker

**Local (development).** `Sut/EShop/pact-broker/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment: { POSTGRES_USER: pact, POSTGRES_PASSWORD: pact, POSTGRES_DB: pact }
  broker:
    image: pactfoundation/pact-broker:latest
    ports: ["9292:9292"]
    depends_on: [postgres]
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pact:pact@postgres/pact
      PACT_BROKER_ALLOW_PUBLIC_READ: "true"
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
```

**CI (and seminar demo).** PactFlow free tier — one org, unlimited pacticipants for OSS, gives HTTPS and a public URL out of the box. Only two GitHub secrets are needed: `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN`. This is the choice for the actual seminar; the docker-compose file above is a fallback for offline development and for the User Guide screencast (S4) so viewers can reproduce without an account.

---

## 8. CI/CD (GitHub Actions)

**`.github/workflows/pact-consumer-web.yml`**

```yaml
name: Pact Consumer (web)
on:
  push:         { paths: ["Sut/EShop/frontend-web/**"] }
  pull_request: { paths: ["Sut/EShop/frontend-web/**"] }
jobs:
  consumer:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: Sut/EShop/frontend-web } }
    env:
      PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
      PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
      GIT_SHA:    ${{ github.sha }}
      GIT_BRANCH: ${{ github.ref_name }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: Sut/EShop/frontend-web/package-lock.json
      - run: npm ci
      - run: npm run test:pact
      - run: npx pact-broker publish ./pacts --consumer-app-version=$GIT_SHA --branch=$GIT_BRANCH --broker-base-url=$PACT_BROKER_BASE_URL --broker-token=$PACT_BROKER_TOKEN
      - name: can-i-deploy
        run: npx pact-broker can-i-deploy --pacticipant eshop-web --version $GIT_SHA --to-environment production
        continue-on-error: true      # promoted to blocking in Iteration 3
```

**`.github/workflows/pact-provider-backend.yml`**

```yaml
name: Pact Provider (backend)
on:
  push:         { paths: ["Sut/EShop/backend/**"] }
  pull_request: { paths: ["Sut/EShop/backend/**"] }
  repository_dispatch:
    types: [contract_requiring_verification_published]
jobs:
  verify:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: Sut/EShop/backend } }
    env:
      PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
      PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
      GIT_SHA:    ${{ github.sha }}
      GIT_BRANCH: ${{ github.ref_name }}
      CI: "true"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: Sut/EShop/backend/package-lock.json
      - run: npm ci
      - run: npm run pact:verify
      - name: can-i-deploy
        run: npx pact-broker can-i-deploy --pacticipant eshop-backend --version $GIT_SHA --to-environment production
```

**Broker → provider webhook.** In the broker UI, register a `contract_requiring_verification_published` webhook that posts a `repository_dispatch` with type `contract_requiring_verification_published` to `https://api.github.com/repos/<owner>/<repo>/dispatches`. This makes the provider re-verify automatically whenever any consumer publishes a new pact, without waiting for a backend commit.

**Deployment gate.** After a successful deploy (real or simulated for the seminar), the CD job runs `npx pact-broker record-deployment --pacticipant eshop-backend --version $GIT_SHA --environment production`. Once baseline is green, `can-i-deploy` loses `continue-on-error` and becomes a hard gate. The seminar activity depends on this being hard by S6.

---

## 9. Week-by-week schedule

| **Week** | **Group** | **Work** | **Deliverable** |
|---|---|---|---|
| W07 Mon–Tue | Preparation | Land the four prerequisite refactors as one PR | `apiClient`, `app` export, `/_pact/setup`, `:memory:` in test mode |
| W07 Wed | Automation | Bring up local broker via docker-compose; sign up for PactFlow free tier | Broker reachable, PactFlow secrets in repo |
| W07 Wed–Thu | Automation | Write 10 consumer interactions in `frontend-web` | `pacts/eshop-web-eshop-backend.json` published to broker |
| W07 Thu | Automation | Write provider verifier + state handlers | `npm run pact:verify` green locally |
| W07 Fri | Automation | Both GitHub Actions workflows + broker webhook | Green pipelines on a demo PR; provider auto-verifies on publish |
| W07 Fri | Documentation | Weekly report `Group12_02.zip`; log FM-02 (if surfaced) | Moodle submission |
| W08 | Automation | Iteration 2 — add `frontend-admin` consumer | Third workflow; admin endpoints in broker matrix |
| W08 | Documentation | User Guide draft (S4); log FM-03 | `T06_UserGuide.md` skeleton |
| W09 | Automation | Iteration 3 — add `frontend-mobile`; make `can-i-deploy` blocking; `record-deployment` step | Deploy gate active |
| W09 | Documentation | Screencast 5–8 min covering Apidog → Apidog AI → Pact | `T06_Screencast.mp4` |
| W10 (S6) | Seminar | Live activity: push a breaking change on `/api/products`, watch provider verify fail, watch `can-i-deploy` block, revert, re-run | In-class demo |

---

## 10. Risks and mitigations

**Risk-mitigation table**

| **Risk** | **Impact** | **Mitigation** |
|---|---|---|
| JWT hard-coded in a contract | Contract becomes brittle and leaks secrets to the broker | Use `M.regex(/^Bearer .+/)` for the Authorization header and inject the real token in `requestFilter` |
| SQLite state pollution between interactions | Verification order-dependent, flaky in CI | Each state handler starts with `db.reset()`; use `:memory:` under `NODE_ENV=test` |
| Over-specification of response bodies | Every cosmetic backend change fails verification (false M6) | Enforce matcher-only response bodies in code review; no literal ids/timestamps/names |
| Confusion with E2E testing | Team assumes Pact replaces integration tests | User Guide segment 3 explicitly states "Pact verifies shape, not behaviour"; keep Apidog scenarios (A/B/C) as the E2E layer |
| Broker unavailable in CI | Every consumer/provider job red | Prefer PactFlow (SaaS) for CI; local docker-compose only for offline dev |
| Contract encodes an EShop defect | E.g. locking in the `password`-leak on `GET /api/users/me` | Write contracts against the **desired** shape; failing verification then becomes a valid M6 entry rather than fossilised buggy behaviour |
| Iteration 1 tries to cover all 31 endpoints | Runs out of time before broker + CI are wired | Ten interactions cap; broker + CI take priority over endpoint breadth |

---

## 11. Cross-references and artifact updates

**Documents this plan reads from**

- [`Material/Config/EShop_OpenApi.yaml`](../../Config/EShop_OpenApi.yaml) — response shapes for matcher authoring.
- [`Material/Document/W07/EShop_Apidog_TestCases.md`](./EShop_Apidog_TestCases.md) — endpoint-by-endpoint reference; contract test names should match Apidog case names where they overlap.
- [`Material/Document/General/EShop_Defect.md`](../General/EShop_Defect.md) — every defect flagged in §5 traces back to an entry here; M6 output feeds back into it.
- [`Sut/EShop/backend/server.js`](../../../Sut/EShop/backend/server.js) and [`Sut/EShop/frontend-web/src/`](../../../Sut/EShop/frontend-web/src/) — implementation truth.

**Documents this plan updates on completion**

- `EShop_Failure_Modes.md` — add FM-02 and FM-03 for Pact-side issues surfaced during implementation.
- `T06_Team_Action_Plan.md` — mark M5/M6 progress; move Pact from "deferred to W07" to "done".
- `Group12.md` (weekly report, W07 onward) — evidence: broker screenshots (`evidence/9.png`+), a green verification run, and one deliberately-red run demonstrating the breaking-change gate.
- `T06_S3_Build_Guide.md` — update the tooling section to reflect that Pact is now implemented, removing any placeholder "planned" language.

---

## 12. Seminar activity script (S6, ~7 minutes)

1. Open the broker matrix in a browser; point out `eshop-web ↔ eshop-backend` currently green.
2. On a fresh branch, in `backend/server.js`, rename `price` → `unitPrice` in the `GET /api/products` handler. Commit and push.
3. Watch `Pact Provider (backend)` run in Actions. It fails at the "Products contract" interaction because the mock recorded by `frontend-web` still expects `price`.
4. Try to merge. `can-i-deploy` blocks the merge (Iteration 3 hard gate).
5. Revert the rename or add a compatibility alias; push again; pipeline goes green; `can-i-deploy` unblocks.
6. Close on the point: neither Apidog nor Apidog AI would have caught this, because both read the spec — and the spec was updated when `price` was renamed. Pact caught it because it reads what the **frontend actually needs**.
