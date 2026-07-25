# EShop Pact — Quickstart

This folder wires **consumer-driven contract testing** into the EShop SUT using
[Pact](https://docs.pact.io/). Plan document:
[Material/Document/W07/EShop_Pact_Plan.md](../../Material/Document/W07/EShop_Pact_Plan.md).

## Layout

```
Sut/EShop/
├─ backend/                       provider
│  └─ pact/
│     ├─ provider.verify.js       verifier entry point
│     └─ states/stateHandlers.js  provider-state seeding + JWT minting
├─ frontend-web/                  consumer (Iteration 1)
│  └─ src/__tests__/pact/
│     ├─ pact-setup.js
│     ├─ auth.consumer.pact.test.js
│     ├─ products.consumer.pact.test.js
│     └─ cart.consumer.pact.test.js
└─ pact-broker/docker-compose.yml Local broker for dev; CI uses PactFlow
```

Workflows: `.github/workflows/pact-consumer-web.yml` and
`pact-provider-backend.yml`.

## First run (local, no broker)

```powershell
# 1. Install deps
cd Sut/EShop/frontend-web
npm install
cd ../backend
npm install

# 2. Generate pact files from the consumer
cd ../frontend-web
npm run test:pact
# → writes pacts/eshop-web-eshop-backend.json

# 3. Verify the provider against the local pact
cd ../backend
npm run pact:verify
```

The provider verifier auto-detects "no broker" and falls back to reading the
local pact file at `../frontend-web/pacts/eshop-web-eshop-backend.json`.

## With a local broker

```powershell
cd Sut/EShop/pact-broker
docker compose up -d
# broker UI: http://localhost:9292   (admin / admin)

$env:PACT_BROKER_BASE_URL = "http://localhost:9292"
$env:PACT_BROKER_TOKEN    = ""   # basic-auth broker doesn't need a token
$env:GIT_SHA              = (git rev-parse HEAD)
$env:GIT_BRANCH           = (git rev-parse --abbrev-ref HEAD)

cd ../frontend-web
npm run test:pact
npm run pact:publish

cd ../backend
npm run pact:verify
```

## With PactFlow (CI recommended)

1. Sign up for the free tier at <https://pactflow.io/>.
2. Set two GitHub secrets on the repo:
    - `PACT_BROKER_BASE_URL` — e.g. `https://<org>.pactflow.io`
    - `PACT_BROKER_TOKEN` — read/write API token
3. Push to `main` or open a PR touching `Sut/EShop/frontend-web/` or
   `Sut/EShop/backend/` — the two workflows will run and populate the broker
   matrix.
4. Register a webhook in the broker UI:
    - Event: `contract_requiring_verification_published`
    - URL: `https://api.github.com/repos/<owner>/<repo>/dispatches`
    - Body: `{ "event_type": "contract_requiring_verification_published" }`
    - This makes the provider re-verify whenever a consumer publishes.

## Seminar demo (S6)

Rename `price` → `unitPrice` in `GET /api/products` inside
[Sut/EShop/backend/server.js](../backend/server.js), commit, and watch the
**Pact Provider (backend)** workflow fail. Revert and it goes green again.
Neither Apidog nor Apidog AI would have caught this — see the plan document for
the full write-up.
