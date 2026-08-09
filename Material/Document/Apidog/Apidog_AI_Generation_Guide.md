# Apidog AI Generation — Step-by-Step Guide

## Overview

Two endpoints, both already load-bearing in your existing deliverables
(User Guide, screencast script, slides, activity worksheet all reference
these two examples specifically) — generating on exactly these two is
enough to make every existing reference true, without needing to run this
across all 31 endpoints.

## Before you start

Confirm the AI provider is connected: **Settings → AI Features** → your
Claude API key should show as configured. If not, add it there first —
Apidog is bring-your-own-model, so this is a one-time setup, not a
per-generation step.

## Step 1 — `PUT /api/users/me` (the SEC-06 example)

1. Open `PUT /api/users/me` in the endpoint tree.

2. Go to the **Test Cases** tab.

3. Click **Generate with AI**.

4. Wait ~30 seconds — this calls the hosted model, don't navigate away.

5. **Do not run the generated cases yet.** Read them first.

6. Look specifically for whether the AI included `role` as a field in any
"valid"/"Success"-categorized case body. This is the predicted finding
— the OpenAPI spec still declares `role` as a settable field (kept
deliberately, per the spec's own SEC-06 documentation), so the AI is
likely to treat it as an ordinary property and include it in a
generated valid case.

7. Copy the full generated output — every case, verbatim, not summarized
— and save it somewhere retrievable (paste into a scratch file, or
directly to me if you want help building the diff table immediately).

## Step 2 — `GET /api/products/:id` (the `{}`-on-404 example)

Repeat steps 2–7 above on this endpoint instead. This one's predicted
finding is different: the AI most likely generates a `404` expectation
for a missing-product case, following the spec's implied behavior — but
the real server returns `200` with an empty object body. So this
generated case is likely to run **red for the wrong reason**: the
assertion is spec-correct, the server is quirky, and the case doesn't
distinguish "the SUT is broken" from "my test is wrong."

## Step 3 — Run both sets of generated cases

Once you've read both outputs without bias, run them. Note the actual
result for each — pass, fail, or "passed but shouldn't have" (the SEC-06
role case running green is exactly this: it passes because the defect is
real, not because the case is correct).

## Step 4 — Build the diff table

Bring both outputs back here (or to whichever session you're using for
the write-up) and I'll help structure the comparison: what the AI covered
well (schema shape, declared types, status codes — this is usually
solid), what it missed (business rules never captured in the spec — coupon
reuse limits, cross-user access controls), and what it got wrong (the two
specific findings above, plus anything else that surfaces).

## What "done" looks like for M4

You don't need exhaustive AI coverage across all 31 endpoints for this to
be a real, defensible M4. Two endpoints, both already central to your
existing narrative, actually generated and actually diffed — that's
complete. Everything else in your deliverables already assumes exactly
this scope; running more than this doesn't strengthen the seminar's
argument, it just spends time you may not have today.
