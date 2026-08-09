# Apidog AI Generation — Step-by-Step Guide

## Overview

Two endpoints, both already load-bearing in your existing deliverables (User
Guide, screencast script, slides, activity worksheet all reference these two
examples specifically) — generating on exactly these two is enough to make every
existing reference true, without needing to run this across all 31 endpoints.

## Before you start

Confirm the AI provider is connected: **Settings → AI Features** → the hosted
provider should show as configured. In the recorded Week 09 run, Apidog used a
free-plan Google/Gemini API key, **Gemini 3.5 Flash**, **Number of Cases:
Auto**, and the endpoint-level credential field was set to `{{bearerToken}}`.
Apidog is bring-your-own-model, so provider quota and bandwidth limits affect
generation directly.

## Step 1 — `PUT /api/users/me` (the SEC-06 example)

1. Open `PUT /api/users/me` in the endpoint tree.

2. Go to the **Test Cases** tab.

3. Click **Generate with AI**.

4. Wait ~30 seconds — this calls the hosted model, don't navigate away.

5. **Do not run the generated cases yet.** Read them first.

6. Look specifically for whether the AI included `role` as a field in any
   "valid"/"Success"-categorized case body. This is the predicted finding — the
   OpenAPI spec still declares `role` as a settable field (kept deliberately,
   per the spec's own SEC-06 documentation), so the AI is likely to treat it as
   an ordinary property and include it in a generated valid case.

7. Copy the full generated output — every case, verbatim, not summarized — and
   save it somewhere retrievable (paste into a scratch file, or directly to me
   if you want help building the diff table immediately).

## Step 2 — `GET /api/products/:id` (the product-id oracle example)

Repeat steps 2–7 above on this endpoint instead. This endpoint was selected
because it has two documented response quirks: a missing product returns
`200 {}` rather than `404`, and even product ids return `price` as a string.

The final recorded generation completed for this endpoint. Apidog AI generated
22 `GET /api/products/{id}` cases across positive, negative, and boundary
categories, then executed them in the Local environment. The run is useful
because it shows both breadth and noise: many invalid-id cases expected `400` or
`404` while the SUT returned `200`, and the `id=2` boundary case passed without
asserting the even-id `price` string quirk.

## Step 3 — Run the completed generated cases

Once you've read the generated outputs without bias, run the completed set(s).
Note the actual result for each — pass, fail, or "passed but shouldn't have."
In the recorded Week 09 evidence, both selected endpoints reached execution.

## Step 4 — Build the diff table

Bring both outputs back here (or to whichever session you're using for the
write-up) and I'll help structure the comparison: what the AI covered well
(schema shape, declared types, status codes — this is usually solid), what it
missed (business rules never captured in the spec — coupon reuse limits,
cross-user access controls), and what it got wrong (the two specific findings
above, plus anything else that surfaces).

## Recorded Week 09 result — Apidog AI on two endpoints

Evidence files:

- Generated checkpoint:
  `Material/Config/Apidog/Checkpoint/AI/seminar.apidog.ai.checkpoint.2.json`
- Combined checkpoint with suite references:
  `Material/Config/Apidog/Checkpoint/seminar.apidog.checkpoint.1.json`
- Executed report for `PUT /api/users/me`:
  `Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-18-35-24.html`
- Executed report for `GET /api/products/{id}`:
  `Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-23-48-02.html`

The AI checkpoint contains **46 generated test-case definitions** total:

| Endpoint | Generated definitions | Execution status |
| --- | ---: | --- |
| `PUT /api/users/me` | 24 | Executed |
| `GET /api/products/{id}` | 22 | Executed |

The `PUT /api/users/me` report executed **25 HTTP requests** because the
role-enum test case used a two-row dataset (`role=user`, `role=admin`).
Apidog v2.8.41 reported:

| Metric | Result |
| --- | ---: |
| HTTP requests | 25 |
| Passed requests | 9 |
| Failed requests | 16 |
| Assertions | 35 |
| Failed assertions | 23 |
| Pass rate | 36% |
| Duration | 2.20s |

Most important result: the generated security case
`Privilege escalation via role parameter (SEC-06) – Regular user attempts to
update role to admin – Expect 403 forbidden` failed with:

```text
HTTP Code Error: Returned 200 while expected 403.
```

That is live Apidog AI execution evidence for the already-known SEC-06 defect.

The same generated set also demonstrates why raw AI output needs review:

- The AI generated a contradictory role-enum case that treated `role=user` and
  `role=admin` as normal positive inputs; both rows returned `200`.
- The "Unsupported HTTP method GET" case was malformed in the exported report:
  it still sent `PUT /api/users/me`, then expected `405`.
- One positive case failed only because the assertion expected
  `Profile updated.` with a period, while the server returns `Profile updated`.
- Many `400` validation cases failed because the handler accepts weakly typed or
  malformed fields instead of validating them.

The `GET /api/products/{id}` report executed **22 HTTP requests**. Apidog
v2.8.41 reported:

| Metric | Result |
| --- | ---: |
| HTTP requests | 22 |
| Passed requests | 3 |
| Failed requests | 19 |
| Assertions | 18 |
| Failed assertions | 18 |
| Pass rate | 13.64% |
| Duration | 1.66s |

The product-id run is mostly cautionary evidence. The three green requests were
simple valid-id checks (`id=5`, `id=2`, `id=1`), and some had no meaningful
assertions beyond the request completing. Many invalid-id and high-id cases
failed because the SUT returned `200` where the AI expected `400` or `404`.
Apidog also raised response-schema failures for empty-object product lookups, so
the earlier candidate concern that schema validation might silently accept the
`{}`-on-404 quirk was not observed in this run.

## What "done" looks like for M4

You don't need exhaustive AI coverage across all 31 endpoints for this to be a
real, defensible M4. The final Week 09 decision is to **freeze M4 at two
executed AI endpoint sets**: `PUT /api/users/me` and
`GET /api/products/{id}`. Describe M4 as a deliberately narrow two-endpoint AI
comparison, not as full-project AI regression coverage.
