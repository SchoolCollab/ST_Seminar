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

**Resolution.** Dropped regex matchers on headers. Response `Content-Type`
assertions were later removed entirely, relying instead on status code and body
shape. For request headers that matter, use plain literals. For
`Authorization`, this is confirmed low-risk: every interaction uses the literal
`Bearer placeholder.token.value` (never a real token, verified via a read-only
check of the generated pact file), and the provider verifier's `requestFilter`
injects the real JWT at verification time regardless of what's recorded in the
contract.

**Lesson for the User Guide.** A testing tool's coverage of "the same feature"
(matchers) is not always uniform across surfaces (body vs. header) — a technique
that's fully supported on one part of a request/response can be broken on
another, and the failure mode may look like an environment problem rather than a
documented tool limitation. Worth checking whether a header assertion is truly
necessary before spending time debugging what looks like a setup issue; if the
consumer does not depend on it, assert status and body shape instead.

---

### FM-03 — A transient Pact FFI crash presented as a code regression, and the diagnostic trail led to the wrong suspect first

**What happened.** A single invocation of `npm run test:pact` crashed with
`PACT CRASHED` errors across every interaction, citing builder methods (`given`,
`withRequest`, `withStatus`, `withResponseBody`) as "invoked out of order." The
crash truncated the pact file mid-write. The next command,
`npm run pact:verify`, then failed with "Failed to parse Pact JSON" — a
downstream symptom of the truncated file, not a separate problem.

**Where it showed up.** Reported during a routine status-report pass,
immediately after a recent code change (routing the Pact consumer tests through
`apiClient` instead of raw `axios`). The timing looked incriminating: the change
had landed a few hours earlier, and the next recorded verification result showed
a new failure that hadn't been there before.

**Why it's misleading.** Two things pointed at the wrong cause simultaneously.
First, the provider verifier's error message ("Failed to parse Pact JSON") reads
like a data-format bug, not a symptom of an upstream crash — nothing in the
message hints that the real failure happened one command earlier. Second, an
initial isolation attempt — temporarily reverting the `apiClient` routing change
and re-running — came back green, which looked like confirmation that the
routing change was the cause. It wasn't: restoring the original code and
re-running _also_ came back green, meaning the first run's failure was a one-off
flake clearing on its own, not something the revert fixed. Five consecutive
clean runs on the untouched code, with and without the routing change, with and
without `--runInBand`, confirmed nothing was actually broken.

**Root cause.** Most likely a transient failure in `pact-js-core`'s Rust FFI
handle at initialization on that one invocation — not reproducible, not tied to
any code or dependency version. Environment-level, not code-level.

**Resolution.** No code changed. No dependency pinned. The fix, when this
recurs, is simply to delete the stale/truncated pact file
(`rm frontend-web/pacts/*.json`) and re-run — treating the crash as a flake to
retry, not a regression to debug.

**Lesson for the User Guide.** A single failing run is not evidence of a
regression on its own — especially when the tool's own error trail points
somewhere plausible but wrong (a JSON parse error blaming the file, not the
process that truncated it), and especially when an isolation test's
"confirmation" might just be a flake clearing rather than the change actually
mattering. Reproduce a failure at least twice, on both sides of a suspected
cause, before trusting an isolation result — one green run after a revert proves
nothing if the original failure was never reproducible in the first place.

**Lesson for the User Guide.**

---

### FM-04 — Parallel Jest workers can race Pact file writes and silently leave a partial consumer contract

**What happened.** Adding Pact tests for `frontend-admin` split the 16
interactions across four Jest files. The first consumer run reported all 16
tests passing, but the generated pact file contained only 7 interactions. The
provider verifier then reported `eshop-admin` as a 7-interaction consumer,
which was wrong — the missing 9 interactions had never made it into the final
pact file.

**Where it showed up.** `frontend-admin/tests/pact/*.pact.test.js`.
Jest ran the Pact test files in parallel workers, and each worker used the same
consumer/provider pair (`eshop-admin` → `eshop-backend`) and the same output
file (`pacts/eshop-admin-eshop-backend.json`). The tests themselves passed; the
bad artifact only became obvious when counting interactions in the generated
pact before provider verification.

**Why it's misleading.** The failure does not point at parallel workers. There
is no direct "file write race" error, and the consumer suite can still look
green. Downstream, the verifier appears to be checking a smaller contract, which
can be mistaken for a test-scope mistake, a Pact merge bug, or another transient
Pact FFI problem. Without explicitly counting the generated interactions, the
missing contracts are easy to miss.

**Root cause.** Multiple Jest workers wrote/merged the same Pact output file for
the same consumer/provider pair concurrently. Pact's file generation is safe
when the suite runs serially, but this project was not configured to force Pact
consumer tests into a single worker.

**Resolution.** Set `maxWorkers: 1` in `frontend-admin/jest.config.mjs` and
regenerated the pact; the file then contained the expected 16 interactions. The
same setting was also added to `frontend-web/jest.config.mjs`, because the first
consumer had the same latent risk even though its smaller three-file suite had
not triggered the race during Iteration 1.

**Lesson for the User Guide.** A green Pact consumer suite is not enough by
itself — verify the generated pact artifact has the expected interaction count,
especially when tests are split across files. Pact consumer generation should be
run serially unless each worker writes a distinct pact file.

---

### FM-05 — Empty-body PUT assertions can turn a non-semantic request detail into a misleading provider-verification timeout

**What happened.** During the frontend-web Pact rebuild, provider verification
timed out on a `PUT /api/orders/1/cancel` interaction that asserted an explicit
empty request body. The same symptom later appeared independently while expanding
`eshop-mobile`'s cancel-order contract, where the extracted mobile API client
sent `JSON.stringify({})` even though the endpoint has no business request
payload. In both cases, the body assertion was not protecting a meaningful
consumer dependency.

**Where it showed up.** First in the corrected `eshop-web` order-cancel contract
for `PUT /api/orders/{id}/cancel`, then independently in the `eshop-mobile`
cancel-order interaction for the same endpoint. The consumer tests themselves
could be made to pass against Pact's mock server, but provider verification hung
instead of returning a clean body-mismatch failure.

**Why it's misleading.** The signal looked like Pact or the provider had stalled,
not like an over-specified contract. Because the request body was `{}` rather
than a business field the UI reads or sends intentionally, the timeout pushed the
debugging path toward transport/tooling behavior instead of the simpler question:
"does this body assertion represent a real consumer dependency?"

**Root cause.** The contract asserted a request-body detail for an endpoint where
the consumers send no meaningful payload. That over-specified the interaction
around an implementation-neutral empty body and made provider verification
brittle in a way that did not correspond to user-visible behavior. The second
mobile occurrence confirmed this is a general empty-body `PUT` assertion hazard,
not a one-off quirk of the original web test file.

**Resolution.** Removed the empty-body and content-type assertions from the
cancel-order interactions. For `eshop-web`, the request is routed as
`apiClient.put('/api/orders/1/cancel', undefined, { headers })`; for
`eshop-mobile`, the extracted API client no longer sends `JSON.stringify({})`
for cancel because the backend ignores `req.body` for this endpoint and the UI
does not depend on an empty payload being present. The contracts now assert the
behavior that matters to the consumers: authenticated cancel requests for the
relevant order states return the expected status/body, without pinning a
meaningless body shape.

The mobile resolution used a different mechanical path from the original
`eshop-web` resolution. The original pattern was "remove the assertion, not the
client behavior": keep the real request intact and avoid asserting incidental
empty bodies. In the mobile case, the empty body was removed from production
client code only after checking both sides: `App.js` only calls
`cancelOrderRequest(token, orderId)` and consumes the returned `{ ok, data }`,
while `server.js`'s `PUT /api/orders/:id/cancel` handler never reads `req.body`.
That made the empty object confirmed dead weight, so deleting it was safe. This
should not be generalized to "delete whatever triggers the timeout"; if a future
empty-body or small-body request carries meaningful consumer behavior, preserve
the client behavior and narrow the Pact assertion instead.

**Lesson for the User Guide.** Pact should assert the request data a consumer
actually depends on, not incidental placeholders. Empty bodies on methods like
`PUT` are especially easy to over-specify: if the UI is not deliberately sending
business data, omit the body assertion and let the contract focus on path,
method, auth, status, and response shape.

---

### FM-06 — Apidog AI can generate both useful defect evidence and contradictory oracles from the same schema

**What happened.** Running Apidog's **Generate Test Cases with AI** on
`PUT /api/users/me` produced a broad generated set: positive, negative,
boundary, and security cases. The useful part was a security test named
`Privilege escalation via role parameter (SEC-06)`, which expected `403` for a
regular user sending `role: "admin"`. The executed report returned `200`,
confirming the known SEC-06 defect live.

The misleading part was in the same generated set. Apidog AI also generated an
enum-coverage positive case with dataset rows `role=user` and `role=admin`,
asserting only that `$.message` was present. Both rows returned `200`, so the
same raw AI output simultaneously treated `role: "admin"` as a security defect
and as a normal valid input.

**Where it showed up.** Checkpoint:
`Material/Config/Apidog/Checkpoint/AI/seminar.apidog.ai.checkpoint.1.json`.
Executed report:
`Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-18-35-24.html`.
The report ran in Apidog v2.8.41 against the Local environment at
`2026-08-09 18:35:01`: 25 HTTP requests, 9 passed, 16 failed, 35 assertions, 23
failed assertions, 36% pass rate.

**Why it's misleading.** The red/green labels are not the truth by themselves.
One red case is valuable defect evidence (`expected 403`, actual `200`). One
green role-enum case is actively misleading because it validates the same
security hole as if it were a supported feature. Other generated failures are
ordinary oracle noise: expecting `Profile updated.` with a period, expecting
`405` from a malformed "GET" case that actually sent `PUT`, or expecting `400`
validation from a handler that the current SUT simply does not validate.

**Root cause.** The AI reads the OpenAPI schema and selected generation
categories, not the SRS or the project's defect catalogue. The schema keeps
`role` in `UpdateProfileRequest` to document the real SUT and SEC-06, but that
does not mean `role` is a valid business input. Broadly selecting every
generation category also encourages validation and security cases whose oracles
must be reviewed against implementation and requirements.

**Resolution.** Keep the SEC-06 failure as live AI-generated defect evidence.
Quarantine or rewrite the role-enum positive case and the malformed/noisy cases
before using the generated set as a regression suite. The second target
endpoint, `GET /api/products/{id}`, was later completed in
`Material/Config/Apidog/Checkpoint/AI/seminar.apidog.ai.checkpoint.2.json` and
executed in
`Material/Config/Apidog/Report/AI/apidog-reports-2026-08-09-23-48-02.html`
(22 requests, 3 passed, 19 failed). That run reinforces the same lesson:
generated cases are hypotheses. It produced broad boundary/negative input
coverage, but many oracles were idealized `400`/`404` expectations against a
SUT that returns `200`, and the green `id=2` case did not assert the known
even-id `price` string quirk.

**Lesson.** Apidog AI output is a strong exploration aid, not an oracle. Treat
each generated case as a hypothesis, then classify it manually as true defect
evidence, useful regression coverage, or generated noise.

---

### FM-07 — Apidog checkpoint re-import preserves environment fields but wipes Local Values

**What happened.** Re-importing the Apidog project checkpoint preserved the
`Local` environment and its variable names, but cleared the Local Value cells.
The full `EShop — Full Regression` suite still executed, so the failure looked
like a real backend or test-suite problem at first. In the report
`Material/Config/Apidog/Report/apidog-reports-2026-08-10-00-36-09.html`, valid
login returned `401`, then protected requests cascaded into `401`, and requests
that depended on blank `orderId`/`productId` values generated URLs such as
`/api/orders//cancel` and `/api/admin/orders//status`.

**Where it showed up.** The first imported run of
`Material/Config/Apidog/Checkpoint/seminar.apidog.checkpoint.2.json`, after the
suite and scenario configuration had been added. The checkpoint contains the
environment structure, but the Apidog desktop import did not preserve the local
credential values used by that environment.

**Why it's misleading.** The test suite can produce a very large red report even
though the SUT, endpoint cases, and suite orchestration are not the first-order
cause. The report showed 235 HTTP requests with 183 failed and 242 assertions
with 174 failed, but many failures were downstream symptoms of blank
credentials and blank chained variables rather than independent endpoint
findings.

**Root cause.** Apidog treats Local Values as local/session data during project
import/export. The variable fields survive, but the values are not reliable
after re-import. This is distinct from FM-01: FM-01 is a variable-name mismatch;
FM-07 is a variable-value wipe even when the names are correct.

**Resolution.** After every import or re-import, manually verify the `Local`
environment values before running the suite. For the current seeded database,
set `userEmail=test@eshop.com`, `userPassword=Test1234!`,
`adminEmail=admin@eshop.com`, and `adminPassword=Admin123!`. Leave
`bearerToken`, `adminToken`, `productId`, and `orderId` blank initially, because
scenario post-processors should populate them during execution.

**Lesson.** Treat an imported Apidog environment as a shape, not as proof that
runtime values are ready. If a full suite suddenly turns mostly red, inspect the
active environment values and the first login request before interpreting the
rest of the failures.

---

## Checked and Remaining Candidates

Things flagged during setup as _possible_ future failure modes. Move an item out
of this list once it becomes a full numbered entry, or keep a short checked note
when the result is useful but does not justify a new FM entry.

- **Apidog's schema auto-validation on the `{}`-on-404 quirk.** Checked once in
  the `GET /api/products/{id}` AI report above. The run did not show a silent
  pass: empty/high-id product responses produced visible "Response data differs
  from endpoint spec" failures. Keep this as observed evidence, not a remaining
  candidate, unless a later report contradicts it.
- **Test Scenario chaining after an early step fails.** Confirmed in the
  `apidog-reports-2026-08-10-00-36-09.html` suite run: login failed with blank
  credentials, but later scenario steps still ran with blank/stale variables and
  produced downstream `401`/blank-id `404` noise. Captured under FM-07 rather
  than split into a separate numbered entry because the root incident was the
  re-imported environment's wiped Local Values.

## How to add an entry

Copy the FM-02/FM-03 block, renumber, and fill in as soon as something goes
wrong — even before you've diagnosed the root cause. A half-filled entry ("What
happened" + "Where it showed up" only) is still more useful than a mental note
you'll forget by Friday.
