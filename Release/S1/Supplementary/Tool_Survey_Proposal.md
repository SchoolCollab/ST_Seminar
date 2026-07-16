# Tool Survey & Proposal — T06 API & Contract Testing

## Overview

This proposal selects three tools, each the best fit for one part of the T06 workflow, and justifies each against the real alternatives in its own category. All three read from EShop's single OpenAPI specification, which keeps the traditional-vs-AI comparison controlled.

- **Apidog (manual mode)** — traditional API testing
- **Apidog AI** — AI-generated API tests from the OpenAPI spec
- **Pact** — consumer-driven contract testing, integrated into CI/CD

## Choice 1 — Apidog (manual API testing)

| Criterion          | **Apidog**                          | Postman                                              | Insomnia                             | Bruno                     |
| ------------------ | ----------------------------------- | ---------------------------------------------------- | ------------------------------------ | ------------------------- |
| **Licence cost**   | Free, up to 4 users; unlimited runs | Free single-user since Mar 2026; paid $9–$49/user/mo | Free Hobby; Pro $12, Ent $45/user/mo | Free, open-source (MIT)   |
| **Learning curve** | Low — GUI, design-first             | Low — GUI                                            | Low — GUI                            | Low — GUI, Git-native     |
| **EShop fit**      | Strong — imports OpenAPI directly   | Strong — REST → collection                           | Strong — REST/GraphQL/gRPC           | Good — REST; offline-only |
| **AI capability**  | Built-in AI generation              | Postbot (metered)                                    | Some AI (Kong-owned)                 | None built-in             |
| **Community**      | Younger (2022), growing             | Very large (~40M)                                    | Established; Kong-direction concerns | Fast-growing, Git-first   |

**Why Apidog:** it is design-first, so EShop's spec becomes the source of truth, and it is the only client here that pairs a full manual workflow with built-in AI generation — letting the traditional and AI halves live in one free tool.

## Choice 2 — Apidog AI (AI test generation)

| Criterion              | **Apidog AI**                                           | Postman Postbot                  | Keploy                                                                 |
| ---------------------- | ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| **Licence cost**       | Bring-your-own-model; free with a local/free-tier model | Metered (~50 AI credits/mo free) | OSS core (Apache 2.0); Playground free (5 AI credits); Pro $24/user/mo |
| **Ease / integration** | In-tool, one action from the spec                       | In-tool (Postman)                | CLI/console; records real traffic via eBPF                             |
| **Spec-to-tests**      | Generates cases directly from the OpenAPI spec          | From natural language / requests | From OpenAPI, curl, Postman, or live traffic                           |
| **Model flexibility**  | Any provider or local model (BYO key)                   | Postman's model only             | Keploy's own AI engine                                                 |
| **Maturity / CI-CD**   | Integrated; growing                                     | Mature ecosystem                 | Strong CI/CD + auto-mocks                                              |

**Why Apidog AI:** it runs in the same tool as my manual tests, so the hand-vs-AI diff is a controlled comparison; bring-your-own-model keeps it free and unmetered, whereas Postbot is metered and Keploy is traffic-first (heavier for a solo, spec-driven study). _As with all AI generation, output is reviewed and validated — it covers the declared schema but misses business rules._

## Choice 3 — Pact (contract testing, CI/CD)

Contract testing is a different category from API clients, so Pact is compared against real contract-testing tools:

| Criterion                    | **Pact**                                                  | Spring Cloud Contract                 | Specmatic                      |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| **Licence cost**             | Free, open-source                                         | Free, open-source                     | OSS core (paid tiers)          |
| **Stack fit (EShop = Node)** | Native JS (`@pact-foundation/pact`)                       | JVM-first — adds a Java toolchain     | JVM-based runner               |
| **Approach**                 | Consumer-driven (expectations → verify provider)          | Provider/consumer via Groovy/YAML DSL | OpenAPI-as-executable-contract |
| **CI/CD integration**        | Pact Broker + `can-i-deploy` gate; runs in GitHub Actions | CI via JVM build                      | CI via JVM runner              |
| **Learning curve (solo)**    | Moderate, well-documented                                 | Higher — Spring/Groovy                | Moderate — own DSL             |

**Why Pact:** EShop's backend is Node, and Pact is JS-native, so it drops in without a Java toolchain; it is the consumer-driven industry standard and is built for CI/CD — publish the contract, verify the provider, and gate the release with `can-i-deploy`.

## Selected stack

**Stack: Apidog (manual + AI) for API testing, plus Pact for contract testing.** Each is the best-fit choice in its category.

- **Whole-topic coverage** — Apidog handles API testing (manual + AI from the same spec); Pact adds the contract half and the CI/CD story that response-only testing skips.
- **Controlled AI comparison** — manual and AI tests share one spec in one tool, isolating exactly what AI adds and misses (declared schema vs business rules).
- **Lowest solo cost** — all three are free for my use (Apidog free tier; bring-your-own / local AI model; Pact open-source), with no Java toolchain and no per-seat metering.
