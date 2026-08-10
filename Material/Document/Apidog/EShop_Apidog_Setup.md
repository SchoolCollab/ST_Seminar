# EShop Apidog Setup — Hooks, Assertions, and Scenarios

## Overview

This document is the runtime companion to `EShop_OpenApi.yaml`. The YAML
describes the API surface; this file describes how the Apidog project on top of
that spec is configured — environment variables, chained-token hook,
per-endpoint assertion scripts, and multi-step scenarios.
`Material/Document/Apidog/EShop_Apidog_TestCases.md` carries the per-endpoint
case pattern established here through all 31 operations, with concrete bodies
and expected outcomes.

It has two audiences. During Week 06 it is a **setup recipe** — follow it
top-to-bottom to configure a fresh Apidog project after importing the YAML.
After Week 06 it is a **reference** — a record of what is configured so the User
Guide (S4) and the AI audit (S8) can cite it.

Nothing in this document belongs in the OpenAPI YAML. All of it is Apidog-side,
test-runtime configuration.

## Prerequisites

- `EShop_OpenApi.yaml` imported as an Apidog project.
- EShop backend running (`http://localhost:3000` by default).
- The seeded regular and admin accounts from `Sut/EShop/backend/database.js`:
  `test@eshop.com` / `Test1234!` and `admin@eshop.com` / `Admin123!`.

## Environment

Set the Base URL at the module level, not as a variable: environment panel →
**Base URL** section (top) → find the row for your module (e.g. **Default
module**) → set it to `http://localhost:3000`. Every request under that module
resolves against it automatically; no `{{baseUrl}}` variable is needed anywhere.

Below that, create a single environment named `Local` with the variables below.
Enter every value in the **Local Value** column of the Variables table — that's
the column an active `Local` environment actually reads. The **Shared Value**
column is a separate, environment-independent default; leave it empty unless you
deliberately want the same value across multiple environments.

| Variable          | Local Value       | Purpose                                                                                                                                                                                        |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userEmail`       | `test@eshop.com`  | Seeded regular-user login body (`Sut/EShop/backend/database.js`).                                                                                                                              |
| `userPassword`    | `Test1234!`       | Seeded regular-user login body.                                                                                                                                                                |
| `newUserPassword` | `Test1234!`       | Password used by the reset-password success case; keep equal to the seeded password for a stable full-suite run, or choose a new value and let the post-processor copy it into `userPassword`. |
| `bearerToken`     | _(empty)_         | Written by the login post-processor; resolved automatically by every protected request's scheme-direct Auth binding.                                                                           |
| `adminEmail`      | `admin@eshop.com` | Seeded admin login body (`Sut/EShop/backend/database.js`).                                                                                                                                     |
| `adminPassword`   | `Admin123!`       | Seeded admin login body.                                                                                                                                                                       |
| `productId`       | _(empty)_         | Written by cart/checkout scenarios so downstream requests reuse a known-good product id.                                                                                                       |
| `orderId`         | _(empty)_         | Written by the checkout scenario so cancel/status-update scenarios reference a real order.                                                                                                     |
| `resetToken`      | _(empty)_         | Written by the forgot-password success case and consumed by reset-password cases.                                                                                                              |

After re-importing a project checkpoint, re-check these **Local Value** cells
before running the suite. Apidog has been observed preserving the variable names
while blanking the values, which makes login return `401` and then cascades into
protected-request `401`s and blank-id `404`s. See
`Material/Document/SUT-Reference/EShop_Failure_Modes.md`, FM-07.

The current full-regression suite also contains explicit Reset blocks between
the major suite phases. Those blocks restore these default values and clear the
runtime variables before the next group runs. That makes full-suite runs more
repeatable, but it does not replace checking the `Local` environment when
sending standalone requests by hand.

Those Reset blocks call `POST /_dev/reset-db`, which resets the SQLite seed data
and clears the backend's process-local `userCarts` object. The cart cleanup is
important because cart state is stored in memory, not in SQLite; see
`Material/Document/SUT-Reference/EShop_Failure_Modes.md`, FM-09.

All variables — regular user and admin — live in this one `Local` environment,
since a scenario needing both tokens in the same run (see Scenario B) requires
them to be active simultaneously.

## Chained-token hook

The hook eliminates manual token copy-paste and makes the whole collection
runnable in one shot. It must be configured **before** the login request is ever
sent — configure it first, then send, not the other way around.

**On the positive `POST /api/login` test case, add a Post Processor.** Its name
in the Apidog UI is **Store Variable** (not "Extract Variable"). Configure it:

| Field          | Value                     |
| -------------- | ------------------------- |
| Variable Name  | `bearerToken`             |
| Variable Scope | Environment Variables     |
| Source         | Response JSON             |
| Extract        | JSONPath _(radio button)_ |
| JSONPath       | `$.token`                 |

This writes the extracted value into `bearerToken`'s **Local Value** cell in the
active (`Local`) environment — the same cell you set up above, now populated
automatically when a successful customer login runs.

Do **not** put this extractor on the endpoint-level `POST /api/login` Post
Processors tab. Endpoint-level post-processors are inherited by the negative
login cases too; those responses do not contain `$.token`, so they can overwrite
a valid `bearerToken` with `undefined`. See
`Material/Document/SUT-Reference/EShop_Failure_Modes.md`, FM-08.

Scenario login steps follow the same rule: customer-login steps extract
`bearerToken <- $.token`; the admin-login step also extracts
`bearerToken <- $.token`, overwriting the regular-user token before the Admin
section. This is intentional: Apidog's imported Auth binding reads
`{{bearerToken}}`, so the obsolete `adminToken` variable is not used.

The forgot-password success case extracts `resetToken <- $.resetToken`; the
reset-password success case uses `{{newUserPassword}}` and then copies that
value into `userPassword` so later login producers stay aligned if you choose a
different post-reset password.

**No manual header configuration is needed on other requests.** Every endpoint
that declares `security: [{ bearerAuth: [] }]` in the OpenAPI spec binds
directly to the `bearerAuth` scheme on import (Apidog's "Corresponding security
scheme" setting), which resolves `{{bearerToken}}` automatically — because
`bearerToken` is the same name Apidog generates as its own default for this
scheme. This only works because the variable name matches; naming it something
else (e.g. `accessToken`) silently breaks every protected request with a `403`,
since the scheme then resolves an empty variable instead. See
`Material/Document/SUT-Reference/EShop_Failure_Modes.md`, FM-01, for the full
diagnosis.

Do **not** set a Bearer Token override on the top-level project folder — it
isn't needed and can cause public endpoints to inherit an auth header they
shouldn't send if introduced later.

Verify by running the whole collection in one shot from a fresh environment
(empty `bearerToken`, `productId`, `orderId`, and `resetToken`); the token
should never be typed by hand, and no request should need a manually-set
`Authorization` header.

## Per-endpoint scenario matrix

For each endpoint under test, configure four scenarios in this order. Each
scenario is a separate request (or Test Case) inside the endpoint's folder in
Apidog.

| #   | Scenario                 | Assertions                                                                    |
| --- | ------------------------ | ----------------------------------------------------------------------------- |
| 1   | **Success** (happy path) | 2xx status; required response fields present; correct types; expected values. |
| 2   | **Invalid auth**         | 401; error body shape matches spec; no protected data leaked.                 |
| 3   | **Invalid parameter**    | 400; error names the offending field; state unchanged.                        |
| 4   | **Not found / conflict** | 404 or 409; error body shape matches spec.                                    |

**Discipline:** every invalid case mutates exactly _one_ field or one value;
everything else stays valid. Two mutations at once means a failure cannot be
attributed to a single cause. This is **single-fault-mode** testing on top of
**equivalence partitioning** (valid vs invalid class) and **boundary-value
analysis** (edge of the valid range).

**Independence:** each scenario cleans up after itself, or asserts against a
known state, so run order does not determine outcome.

## Worked example — `POST /api/cart`

The pattern below is the reference for every other endpoint. Once one is done,
the others follow.

| Case                              | Request body                             | Auth           | Expected status     | Key assertions                                                                       |
| --------------------------------- | ---------------------------------------- | -------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Success                           | valid `productId`, `quantity` = 1        | valid          | 200                 | Response `message` = `"Added to cart"`; subsequent `GET /api/cart` returns the item. |
| Invalid auth                      | valid body                               | header omitted | 401                 | Cart is unchanged when re-fetched with valid auth.                                   |
| Invalid param — bad productId     | non-existent `productId`, valid quantity | valid          | 400 or 404          | Error body cites `productId`; cart unchanged.                                        |
| Invalid param — zero quantity     | valid `productId`, `quantity` = 0        | valid          | 400 (boundary)      | Error body cites `quantity`; cart unchanged.                                         |
| Invalid param — negative quantity | valid `productId`, `quantity` = -1       | valid          | 400 (invalid class) | Error body cites `quantity`; cart unchanged.                                         |

The full set — every endpoint, all 31 operations, with concrete bodies, auth,
and expected status (including which "wrong-looking" results are actually
documented defects) — is in
`Material/Document/Apidog/EShop_Apidog_TestCases.md`. Work through that file for
every endpoint beyond this one; save each case as its own Test Case inside the
endpoint's folder.

## Assertion scripts

Assertions live under a case's **Post Processors** tab, in two forms: the
**Response validation (Contract testing)** toggle (turn it on, pick the expected
status code — auto-validates the response body against the OpenAPI schema, no
manual config needed) and individually-added **Assertion** post-processors
(Name, Target Object — e.g. `HTTP Code` or `Response Header` — plus a comparison
operator and expected value). A third option, **Script** post-processors, takes
raw JavaScript for checks the UI can't express — arithmetic invariants,
cross-field relationships. Prefer Response validation + Assertion where they
suffice; drop to Script only when the check is genuinely non-trivial. Full
field-by-field walkthrough is in
`Material/Document/Apidog/EShop_Apidog_Steps.md`, Step 6a.

**Assertions to configure on every case:**

- Status code equals the expected value (Assertion post-processor, Target Object
  `HTTP Code`).
- Response header `Content-Type` equals/contains `application/json` (Assertion
  post-processor, Target Object `Response Header` — catches the
  SQL-error-returns-HTML branch on `GET /api/products?search=…`).
- Response validation toggle ON with the case's expected status selected (covers
  "body matches the declared schema").

**Script post-processor example** — asserting
`final_amount = total_amount − discount_amount` on `POST /api/apply-coupon`:

```js
pm.test('Final amount equals total minus discount', () => {
    const body = pm.response.json()
    pm.expect(body.final_amount).to.equal(
        body.total_amount - body.discount_amount
    )
})
```

This kind of business-rule check is what the AI-generated tests will not produce
— the AI has the schema but not the invariant.

## Multi-step scenarios

Individual requests test one endpoint at a time. Scenarios chain them to
exercise real user flows and to catch bugs that only appear across requests
(e.g. checkout not clearing the cart).

Configure four scenarios under Apidog **Test Scenarios**:

**Scenario A — Happy-path purchase.** `POST /api/register` → `POST /api/login` →
`GET /api/products` (capture one `productId`) → `POST /api/cart` →
`POST /api/checkout` (capture `orderId`) → `GET /api/orders/my-orders`. Final
assertion: the new order appears in the list, and its `total_amount` matches
what the checkout returned.

**Scenario B — Order state machine.** Log in as admin first, extracting the
admin JWT into `bearerToken` (overwriting any regular-user token) → create an
order via Scenario A if needed → `PUT /api/admin/orders/{orderId}/status`
walking `pending → confirmed → shipping → delivered`. Each status-update request
stays on the imported bearerAuth scheme, which resolves `{{bearerToken}}`. This
demonstrates the intended admin flow — functionally a regular user's token would
also work here, since the SUT does not check role on admin endpoints (a
documented defect), but the separate admin login keeps the suite honest about
the role it meant to exercise. Assert each transition returns 200; assert the
illegal `pending → delivered` transition returns 400.

**Scenario C — Coupon flow.** Log in → `POST /api/apply-coupon` with a
known-good code → assert `final_amount` matches the expected math. This scenario
is where the buggy percent formula is most visible; document the actual
`final_amount` returned so the User Guide's Failure Modes section can cite it
verbatim.

**Scenario D — Auth + profile flow.** Register a scenario-only user → log in and
capture `bearerToken` → `GET /api/users/me` → `PUT /api/users/me` for a normal
profile update → send the SEC-06 role-field probe. The token extractor belongs
on the successful scenario login step, not on the endpoint-level login
processor.

Each scenario runs in Apidog with a single click and produces a linear log —
ideal source material for the S6 live demo.

## What is deliberately not configured

Naming what is _not_ here matters for the seminar's honesty:

- **No assertions on the `password` field of `GET /api/users/me`.** The field
  exists (SUT defect) but a test asserting on it would codify the defect. The
  scenario for that endpoint asserts only what the spec _should_ return.
- **No assertions on `role` in `PUT /api/users/me` valid requests.** Same reason
  — the field is accepted by the SUT (SEC-06 defect) but never appears in a
  valid client body.
- **No load or performance testing.** Out of scope for T06.
- **No Pact contract tests here.** Contract testing lives in a separate file
  (`EShop_Pact_Setup.md`, deferred to Week 07); the split keeps Apidog and Pact
  concerns independent.

## Verification

After configuring the above, run the full collection from a fresh environment
(empty `bearerToken`, empty `productId`, empty `orderId`, empty `resetToken`).
Expected outcome:

- Every Scenario-1 (success) request returns 2xx.
- Every Scenario-2 (invalid auth) request returns 401.
- Every Scenario-3/4 (invalid param, not found) request returns 4xx with a
  schema-matching error body.
- The four multi-step scenarios complete end-to-end without human intervention.
- The chained-token hook fires exactly once per successful login step and every
  subsequent request resolves the current `bearerToken`. The Normal-user section
  starts with a regular login; the Admin section starts with an admin login that
  overwrites `bearerToken`.

Any deviation from the above is either an Apidog misconfiguration (fix here) or
a SUT defect (log it in `Material/Document/SUT-Reference/EShop_Defect.md`).
