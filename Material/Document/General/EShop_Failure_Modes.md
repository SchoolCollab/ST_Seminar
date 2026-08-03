# Apidog / AI Tooling — Failure Modes Log

## Overview

This document tracks ways the **testing tooling** (Apidog, its AI generation,
the OpenAPI import pipeline) misled or produced incorrect results during this
project — as opposed to `EShop_SUT_Quirks.md`, which tracks bugs in **EShop
itself**. The distinction matters: this file is the source for the User Guide's
required Failure Modes section (≥3 real ways the tool can mislead you).

Log an entry the moment something is caught — small or large, resolved or not —
while it's fresh. Entries can be trimmed or merged later; missing one because it
wasn't written down is the worse failure mode.

## Log

### FM-01 — Apidog auto-generates a mismatched default auth variable on OpenAPI import

**What happened.** Importing `EShop_OpenApi.yaml` caused Apidog to auto-bind
every protected endpoint's Auth tab to a default token variable name that Apidog
invents on its own — not one read from the spec or from any project convention.
If the environment's own token variable happens to be named differently (whether
by following the setup guide, by a different tester's own naming choice, or by
any other project-specific convention), the two names diverge silently. Requests
using the unmatched default silently sent `Authorization: Bearer ` (empty),
returning `403 Forbidden` — indistinguishable at first glance from a real
auth-logic bug in EShop.

**Where it showed up.** `GET /api/cart` (found first), and consistently on every
endpoint under Categories, Cart, Orders, Coupons, and Admin. Authentication and
Products were unaffected, which is explained below; Users was also reported
unaffected at the time, though its two endpoints (`GET`/`PUT /api/users/me`)
declare `security: [{ bearerAuth: [] }]` in the spec just like the broken
folders — that exception is unresolved and worth re-checking rather than assumed
benign.

This traces to an explicit setting in Apidog's OpenAPI import dialog: endpoints
whose operation specifies a security scheme are set to **use that scheme
directly** (which is where the mismatched default variable gets bound);
endpoints with no security scheme declared (`security: []` in the YAML) default
to **Inherit from parent**. That mechanism cleanly explains why Authentication
and most of Products were unaffected — their operations declare `security: []`.
It does not fully explain Users being unaffected, since its endpoints have a
security scheme declared and should, by the same mechanism, have gotten the
direct-bind treatment. Possible explanations not yet confirmed: Users may have
been checked and fixed before the rest were surveyed, or spot-checked without
actually sending a request. Flagged here rather than silently resolved.

**Why it's misleading.** The failure looks exactly like a token-not-populated
bug or a real JWT verification bug. Nothing in the error
(`{"error": "Forbidden"}`) hints that the cause is a variable-name mismatch
rather than an actually-invalid token. Diagnosing it required inspecting the raw
outgoing request headers, not just the response.

**Root cause.** Apidog's Security Scheme model is, by its own documentation, an
intentional "separation of template and value" — the scheme (`bearerAuth`: type,
header, prefix) is a reusable template, and the actual token _value_ is meant to
be bound separately, via a variable, at the folder or request Auth tab. That
design is correct and is not the defect. The actual failure is narrower: **on
OpenAPI import, Apidog auto-binds every endpoint's Auth tab to a default
token-variable name it invents itself, with no check against the environment's
existing naming convention, and no import-time warning that the two disagree.**
The scheme definition itself (confirmed via `Advanced Configuration → Schema`)
has no field for specifying this binding — it is not part of the OpenAPI
standard, only an Apidog-internal default applied silently per request.

**Resolution.** Renamed the environment's token variable from `accessToken` to
`bearerToken` to match Apidog's auto-generated default, then rebuilt the login
post-processor to target the matching name. This fix is at the root cause, not a
workaround: with the names aligned, the default import setting ("for endpoints
with security defined, set Auth to Corresponding security scheme") now resolves
the token correctly on its own. No folder-level Auth override is needed — a
Root-level Bearer Token configuration that was set as an earlier workaround was
removed once the rename made it redundant, and public endpoints (`security: []`,
set to Inherit from parent) correctly fall back to No Auth from an unconfigured
Root. Confirmed this survives re-import, since the fix lives in the environment
variable name rather than in per-session folder configuration.

**Lesson for the User Guide.** The tool's underlying design (template/value
separation) is sound and well-documented — the failure is that its _default_
value-binding is generated silently and never reconciled against pre-existing
project state, so a structurally correct feature produces a misleading result in
practice. The fix wasn't "the auth model is broken," it was "match the tool's
naming convention rather than fight it." Always inspect the _actual outgoing
request_, not just the response, before assuming the SUT is at fault.

---

### FM-02 — PactV3's Rust FFI crashes on regex matchers applied to headers

**What happened.** Using `MatchersV3.regex(...)` on a header value —
specifically the `Content-Type` response header and the `Authorization` request
header — crashed the underlying Rust FFI layer that `@pact-foundation/pact`'s
`PactV3` wraps, rather than failing gracefully or rejecting the matcher with a
clear error.

**Where it showed up.** Writing consumer contract tests for `eshop-web` against
the backend. Any interaction that tried to assert a header via regex (rather
than an exact string) triggered the crash during test setup, before the mock
server even received a request.

**Why it's misleading.** The crash surfaces from a native binary layer, not from
JavaScript, so the error is opaque compared to a normal Jest assertion failure —
it looks like an environment or installation problem rather than a specific,
narrow incompatibility between `PactV3` and header-level regex matchers
specifically (matchers on body fields work fine).

**Root cause.** Not fully diagnosed — appears to be a real limitation or bug in
the current `PactV3` FFI bindings' handling of regex matchers when applied to
headers specifically, rather than a usage mistake. Not something a
workaround-free fix was found for in the time available.

**Resolution.** Dropped regex matchers on both affected headers and used plain
string literals instead. For `Authorization`, this is confirmed low-risk: every
interaction uses the literal `Bearer placeholder.token.value` (never a real
token, verified via a read-only check of the generated pact file), and the
provider verifier's `requestFilter` injects the real JWT at verification time
regardless of what's recorded in the contract. For `Content-Type`, the literal
already includes the charset (`'application/json; charset=utf-8'`) — the
brittleness runs the opposite way from what was first assumed here: it fails if
the server ever _drops or changes_ the charset, not if one gets appended. Still
a real trade-off accepted to work around the crash; the fix under consideration
is dropping the header assertion entirely and relying on status + body shape
instead.

**Lesson for the User Guide.** A testing tool's coverage of "the same feature"
(matchers) is not always uniform across surfaces (body vs. header) — a technique
that's fully supported on one part of a request/response can be broken on
another, and the failure mode may look like an environment problem rather than a
documented tool limitation. Worth checking whether a header assertion is truly
necessary before spending time debugging what looks like a setup issue.

---

### FM-03 —

**What happened.**

**Where it showed up.**

**Why it's misleading.**

**Root cause.**

**Resolution.**

**Lesson for the User Guide.**

---

## Candidates to watch for (not yet confirmed)

Things flagged during setup as _possible_ future failure modes, worth
deliberately testing for rather than waiting to stumble on:

- **AI-generated tests asserting on documented-but-invalid fields.** The
  `UpdateProfileRequest` schema keeps `role` for accuracy (SEC-06 defect), but
  if Apidog AI generates a "valid" test case that includes `role` in the body,
  that test is validating a security hole as if it were a feature. Watch for
  this specifically when running AI generation (Fri, Week 06).
- **Apidog's schema auto-validation passing on the `{}`-on-404 quirk.** Since
  `Product` schema uses `oneOf` to accommodate both a real product and an empty
  object, Apidog's auto-schema-check may report "valid" on a response that a
  stricter test would flag as wrong. Confirm whether Apidog's pass/fail
  correctly distinguishes these two cases or blurs them.
- **Test Scenario chaining silently continuing after a step fails.** Not yet
  confirmed either way — verify whether a failed assertion in an early scenario
  step (e.g. login) actually halts the scenario, or whether later steps run
  anyway with stale/empty variables and produce confusing downstream failures.

## How to add an entry

Copy the FM-02/FM-03 block, renumber, and fill in as soon as something goes
wrong — even before you've diagnosed the root cause. A half-filled entry ("What
happened" + "Where it showed up" only) is still more useful than a mental note
you'll forget by Friday.
