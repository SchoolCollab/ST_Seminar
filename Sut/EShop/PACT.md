# EShop Pact — Quickstart

This folder wires **consumer-driven contract testing** into the EShop SUT using
[Pact](https://docs.pact.io/). Plan document:
[Material/Document/Pact/EShop_Pact_Plan.md](../../Material/Document/Pact/EShop_Pact_Plan.md).

## Layout

```
Sut/EShop/
├─ backend/                       provider: eshop-backend
│  └─ pact/
│     ├─ provider.verify.js       verifier entry point
│     └─ states/stateHandlers.js  provider-state seeding + JWT minting
├─ frontend-web/                  consumer (Iteration 1)
│  ├─ tests/pact/                 Pact consumer tests
│  └─ pacts/                      generated eshop-web pact
├─ frontend-admin/                consumer (Iteration 2)
│  ├─ tests/pact/                 Pact consumer tests
│  └─ pacts/                      generated eshop-admin pact
├─ frontend-mobile/               consumer (Iteration 3)
│  ├─ src/api/apiClient.js        plain JS API module under test
│  ├─ tests/pact/                 Pact consumer tests
│  └─ pacts/                      generated eshop-mobile pact
└─ pact-broker/docker-compose.yml optional local broker for dev
```

Workflows:

- `.github/workflows/pact-consumer-web.yml`
- `.github/workflows/pact-consumer-admin.yml`
- `.github/workflows/pact-consumer-mobile.yml`
- `.github/workflows/pact-provider-backend.yml`

Each consumer workflow generates that consumer's pact, installs the backend, and
verifies that pact against the checked-out provider with `PACT_VERIFY_ONLY`.
The provider workflow is kept for manual demo runs and future Pact Broker
webhooks.

## First run (local, no broker)

```powershell
# 1. Install deps
cd Sut/EShop/frontend-web
npm install
cd ../frontend-admin
npm install
cd ../frontend-mobile
npm install
cd ../backend
npm install

# 2. Generate pact files from all consumers
cd ../frontend-web
npm run test:pact
cd ../frontend-admin
npm run test:pact
cd ../frontend-mobile
npm run test:pact

# 3. Verify the provider against the local pact files
cd ../backend
npm run pact:verify
```

The provider verifier auto-detects "no broker" and falls back to reading the
local pact files in `frontend-web/pacts/`, `frontend-admin/pacts/`, and
`frontend-mobile/pacts/`. The documented local provider baseline is currently
`46/51` overall: `eshop-web` 14/17, `eshop-admin` 20/21, and `eshop-mobile`
12/13.

To run the whole local check with consumer generation plus baseline-aware
provider parsing:

```bash
cd Sut/EShop
./run_tests.sh
```

## With a local broker

```powershell
cd Sut/EShop/pact-broker
docker compose up -d
# broker UI: http://localhost:9292   (admin / admin)

$env:PACT_BROKER_BASE_URL = "http://localhost:9292"
$env:PACT_BROKER_TOKEN    = ""   # basic-auth broker doesn't need a token
$env:GIT_SHA              = (git rev-parse HEAD)
$env:GIT_BRANCH           = (git rev-parse --abbrev-ref HEAD)

cd ../frontend-web  && npm run test:pact && npm run pact:publish
cd ../frontend-admin && npm run test:pact && npm run pact:publish
cd ../frontend-mobile
npm run test:pact
npx --yes @pact-foundation/pact-cli pact-broker publish ./pacts --consumer-app-version="$env:GIT_SHA" --branch="$env:GIT_BRANCH" --broker-base-url="$env:PACT_BROKER_BASE_URL" --broker-token="$env:PACT_BROKER_TOKEN"

cd ../backend
npm run pact:verify
```

## With PactFlow (CI recommended)

1. Sign up for the free tier at <https://pactflow.io/>.
2. Set two GitHub secrets on the repo:
    - `PACT_BROKER_BASE_URL` — e.g. `https://<org>.pactflow.io`
    - `PACT_BROKER_TOKEN` — read/write API token
3. Push to `main` or open a PR touching any frontend Pact consumer or
   `Sut/EShop/backend/`. The matching consumer workflow generates its pact and
   verifies it against the provider in the same job. If broker secrets are set,
   it also publishes the pact.
4. Register a webhook in the broker UI:
    - Event: `contract_requiring_verification_published`
    - URL: `https://api.github.com/repos/<owner>/<repo>/dispatches`
    - Body: `{ "event_type": "contract_requiring_verification_published" }`
    - This makes the provider re-verify whenever a consumer publishes.

## Seminar demo (S6)

Rename `price` → `unitPrice` in `GET /api/products` inside
[Sut/EShop/backend/server.js](../backend/server.js), commit, and watch the
consumer/provider verification fail for `eshop-web`, `eshop-admin`, and
`eshop-mobile`, because all three real consumers depend on `price`. Revert and
it returns to the documented 46/51 baseline. Neither Apidog nor Apidog AI would
have caught this if the spec moved with the code — see the plan document for the
full write-up.
