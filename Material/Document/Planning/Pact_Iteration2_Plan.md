# Pact Iteration 2 — frontend-admin — Plan and Prompts

## Status: superseded — all three Pact iterations are now complete

This document was the prospective execution plan for Iteration 2
(`frontend-admin`) only, written when `frontend-mobile` (Iteration 3) was still
deferred. Both Iteration 2 and Iteration 3 have since been executed and
verified. `Material/Document/Pact/EShop_Pact_Plan.md` is the current source of
truth for what was actually built (three consumers — `eshop-web`,
`eshop-admin`, `eshop-mobile` — 51 interactions, 46/51 baseline) and for
current CI/CD behavior. Kept below as-written for the historical record of the
phase-by-phase prompts used to drive Iteration 2; do not follow it as current
instructions for scope (it still describes mobile as deferred, which is no
longer true).

## Overview

Extends Pact from one consumer to two: `frontend-admin` alongside the existing
`frontend-web`. Scoped deliberately to _one_ new consumer, not both remaining
ones — `frontend-mobile` stays deferred. Every prompt here bakes in a lesson
learned the hard way during Iteration 1, so those mistakes aren't repeated: no
regex header matchers, rerun before trusting an unexpected failure, investigate
before refactoring, and confirm scheme/response-id details against real project
state rather than assuming they match `frontend-web`'s.

Run the phases in order. Each phase ends with a report-back step — don't let
Claude Code proceed to writing code until the investigation phase (Phase 1)
comes back and you've reviewed it.

---

## Phase 0 — Confirm the file-reversion risk is resolved

Before generating anything new that could get silently overwritten the same way
`Material/Document/Apidog/EShop_Apidog_TestCases.md` was twice.

```
Before starting any new work: run `ps` (or the Windows equivalent) and list
any VS Code or Codex-related processes still running with a working
directory inside this repo. Report what you find — I want to confirm the
earlier concurrent-write-access issue with another AI agent session is
actually resolved before generating new files that could be silently
overwritten the same way EShop_Apidog_TestCases.md was twice this session.
Don't proceed to Phase 1 until I've confirmed this is clear.
```

---

## Phase 1 — Investigate `frontend-admin`'s actual API surface (report only, no code)

```
Investigate Sut/EShop/frontend-admin/ — do not write or modify any code in
this task, report findings only.

1. Does this app have a centralized API client (like frontend-web's
   src/api/apiClient.js — a single axios.create() instance), or are API
   calls scattered across multiple files with their own axios imports and
   hard-coded base URLs? Show me the actual pattern with file references.

2. List every distinct backend endpoint this app calls, with method and
   path, cross-referenced against Material/Config/EShop_OpenApi.yaml. I
   expect this to lean heavily on the Admin and Coupons sections of the
   API, but don't assume — confirm from the actual source.

3. Does this app already have any test infrastructure at all (Jest config,
   a __tests__ folder, any existing test files)? If Jest isn't configured,
   note what would be needed (babel config, jest config) — mirroring what
   frontend-web needed, but confirm rather than assume it's identical.

4. Does this app use JWT auth the same way frontend-web does (a token
   stored somewhere and attached as a Bearer header), or does it have its
   own auth pattern? Admin flows sometimes handle auth differently — check
   rather than assume it's the same mechanism.

5. Estimate the size of the same apiClient-extraction refactor
   frontend-web needed, applied here — rough file count and line count,
   not exact.

Report all five findings. I'll decide the exact consumer interaction list
and refactor scope based on what you find — don't start building anything
yet.
```

**Stop here and review.** If `frontend-admin` turns out to have a wildly
different shape than expected (e.g., no clean way to inject a mock server URL,
or auth handled through some mechanism that doesn't map cleanly to a Bearer
token), that changes the plan below — come back and adjust before Phase 2.

---

## Phase 2 — Refactor (if needed) and write consumer tests

Only proceed once Phase 1's findings are reviewed. This prompt assumes the
investigation confirms a similar shape to `frontend-web`; adjust before sending
if it doesn't.

```
Based on the Phase 1 investigation, extract frontend-admin's API calls into
a single apiClient (mirroring frontend-web/src/api/apiClient.js exactly —
axios.create() with a baseURL overridable via an env var), then set up Jest
the same way frontend-web has it configured (same babel-plugin-transform-
vite-meta-env dependency if this app also uses import.meta.env).

Write Pact consumer interactions for the endpoints identified in Phase 1.
Two hard rules, both learned from frontend-web's implementation:

1. Do NOT use MatchersV3.regex on any header value (Content-Type,
   Authorization, or otherwise) — this crashes the Pact Rust FFI. Assert
   status code and body shape only; skip header assertions entirely unless
   there's a specific reason one matters for a given interaction.

2. Route every consumer test's requests through apiClient with baseURL
   overridden to the mock server's url, not raw axios — this was a defect
   in frontend-web's first implementation, fixed after the fact. Build it
   correctly the first time here.

Name the consumer 'eshop-admin' in the Pact configuration (distinct from
'eshop-web'), so both consumers' contracts against 'eshop-backend' can
coexist without colliding.

Show me the full set of interactions you've written (Given/uponReceiving/
withRequest/willRespondWith for each) before running anything, so I can
review the interaction list against what Phase 1 found.
```

---

## Phase 3 — Provider verification for two consumers

```
Extend Sut/EShop/backend/pact/provider.verify.js to verify against both
consumer contracts — 'eshop-web' (existing) and 'eshop-admin' (new). Check
whether this needs a second Verifier configuration, or whether one
Verifier instance can take multiple pact file paths / consumer version
selectors — look at the actual @pact-foundation/pact API rather than
assuming.

If frontend-admin's endpoints need new provider states (e.g. seeding an
admin-authenticated user, or specific coupon/order data), add them to
Sut/EShop/backend/pact/states/stateHandlers.js following the same pattern
already used there — mint tokens directly via jsonwebtoken, don't exploit
SEC-06 to get an admin token, same as the existing handlers do.

Run the verification. Report the pass/fail count for BOTH consumers
separately — I want to see frontend-web's existing 10 interactions and
frontend-admin's new ones as distinct numbers, not a combined total, so a
regression in one doesn't get hidden inside an aggregate.
```

---

## Phase 4 — Rerun before trusting anything unexpected

```
Run the full verification cycle (both consumers) three times in a row,
not once. This project has a documented precedent (FM-03 in
Material/Document/SUT-Reference/EShop_Failure_Modes.md) of a transient Pact FFI crash that looked like a
real regression on a single run and wasn't reproducible on repeat runs.

Report all three runs' pass/fail counts. If any run differs from the
others — different count, a different failing interaction — say so
explicitly and do not treat it as confirmed until it reproduces at least
twice. If all three runs match, state that plainly as the confirmed
baseline.
```

---

## Phase 5 — CI and documentation

```
Extend .github/workflows/pact-consumer-web.yml or add a parallel
pact-consumer-admin.yml (your call on which is cleaner — report which you
chose and why) so frontend-admin's consumer tests run in CI the same way
frontend-web's do. Keep can-i-deploy advisory (continue-on-error) — do NOT
promote either consumer's gate to hard-blocking; that's still out of
scope.

Then update Material/Document/Pact/EShop_Pact_Plan.md: add a new section
documenting Iteration 2 (frontend-admin) using the same structure as the
existing frontend-web sections — what it covers, the confirmed result,
any failures and their root causes, and update the status line at the top
to reflect two consumers now, not one. Do not remove or alter the existing
frontend-web content.

Report the final state: total interaction count across both consumers,
confirmed pass/fail baseline (from Phase 4's triple-run), and the commit
hash(es).
```

---

## What stays deferred, unchanged

`frontend-mobile` (Iteration 3) and the hard `can-i-deploy` gate remain out of
scope after this. If Iteration 2 goes smoothly and there's real time left before
the pre-share deadline, `frontend-mobile` would need its own Phase 1-style
investigation from scratch — React Native's Jest setup is a different problem,
not a copy of this plan.
