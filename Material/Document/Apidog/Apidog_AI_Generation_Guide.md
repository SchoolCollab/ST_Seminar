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

## Step 2 — `GET /api/products/:id` (the `{}`-on-404 example)

Repeat steps 2–7 above on this endpoint instead. This endpoint was selected
because it has two documented response quirks: a missing product returns
`200 {}` rather than `404`, and even product ids return `price` as a string.

The recorded partial generation did **not** make the predicted `404` mistake:
it generated a missing-product case expecting `200` with an empty object. It did
not finish the endpoint, though, so the even-id price-string quirk and Apidog's
schema auto-validation behavior remain unconfirmed for this AI track.

## Step 3 — Run the completed generated cases

Once you've read the generated outputs without bias, run the completed set(s).
Note the actual result for each — pass, fail, or "passed but shouldn't have."
In the recorded run, only `PUT /api/users/me` reached execution; the product-id
endpoint stopped during generation because of hosted-provider bandwidth/quota.

## Step 4 — Build the diff table

Bring both outputs back here (or to whichever session you're using for the
write-up) and I'll help structure the comparison: what the AI covered well
(schema shape, declared types, status codes — this is usually solid), what it
missed (business rules never captured in the spec — coupon reuse limits,
cross-user access controls), and what it got wrong (the two specific findings
above, plus anything else that surfaces).

## Recorded Week 09 result — `PUT /api/users/me`

Evidence files:

- Generated checkpoint:
  `Material/Checkpoint/AI/seminar.apidog.ai.checkpoint.1.json`
- Executed report:
  `Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-18-35-24.html`

The checkpoint contains **27 generated test-case definitions** total:

| Endpoint | Generated definitions | Execution status |
| --- | ---: | --- |
| `PUT /api/users/me` | 24 | Executed |
| `GET /api/products/{id}` | 3 | Not executed in the report; generation stopped early |

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

`GET /api/products/{id}` generation was incomplete because the free-plan
Google/Gemini key hit a bandwidth/quota limit. The partial checkpoint includes
the `{}`-with-`200` missing-product case, but it does not yet include the
even-id `price`-as-string case, and there is no execution report for this
endpoint.

## What "done" looks like for M4

You don't need exhaustive AI coverage across all 31 endpoints for this to be a
real, defensible M4. The recorded result now supports the `PUT /api/users/me`
half strongly: AI generated cases, the run executed, and SEC-06 was confirmed
live. The `GET /api/products/{id}` half remains explicitly partial because the
hosted-provider quota stopped generation before the endpoint was fully covered.
Do not describe the product endpoint as complete until a second checkpoint/report
exists for it.
