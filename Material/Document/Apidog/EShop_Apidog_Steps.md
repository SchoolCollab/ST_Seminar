# EShop Apidog — Step-by-Step Setup

## Overview

Step-by-step build of the Apidog project from `EShop_OpenApi.yaml` through a
fully configured collection with the chained-token hook, per-endpoint scenarios,
and multi-step flows. The end state is a project runnable green from a fresh
environment in one click. Step 6/6a here establish the mechanics on one endpoint
in full detail; `Material/Document/Apidog/EShop_Apidog_TestCases.md` carries the same pattern through all
31 operations with concrete case values, and is the file to work from for Step 7
onward.

Prerequisites: `EShop_OpenApi.yaml` on disk, EShop backend running at
`http://localhost:3000`, two accounts registered against the running backend —
one regular user, one promoted to admin (see `Material/Document/Apidog/EShop_Apidog_Setup.md` or the
SEC-06 role-injection flow for how to promote).

## Step 1 — Import the OpenAPI file

1. Apidog → New Project (or open an existing empty project) → **Import** →
   **OpenAPI / Swagger**.
2. Select `EShop_OpenApi.yaml`.
3. In the import dialog's **Import Security Scheme** section, leave the defaults
   as-is:
    - **"Set the Auth for the 'Root' folder as the global security scheme"** —
      leave **unchecked**. The spec has no top-level `security:` key, so
      checking this would force Root's Auth to "No Authentication," which would
      clobber any Bearer configuration on Root and break inheritance for public
      endpoints that rely on it.
    - **"For imported endpoints with security defined, set Auth to"** — leave on
      **"Corresponding security scheme."** Every protected endpoint binds
      directly to the `bearerAuth` scheme; this resolves correctly on its own as
      long as the environment's token variable is named `bearerToken` (Apidog's
      own generated default — see Step 4's naming note).
    - **"For imported endpoints without security defined, set Auth to"** — leave
      on **"Inherit from parent."** Public endpoints then default to Root's
      Auth, which should stay unconfigured (No Auth) — see the note at the end
      of Step 5.
4. Confirm the import.
5. Expected result: the left-hand sidebar shows the endpoint tree grouped by tag
   (Authentication, Users, Products, Categories, Cart, Orders, Coupons, Admin).
   Schemas appear under **Schema Management**.

## Step 2 — Create the `Local` environment

1. Top-right environment dropdown → **Manage Environments** → **New
   Environment** → name it `Local`.
2. At the top of the environment panel, under **Base URL**, find the row for
   **Default module** (or whichever module your endpoints imported into) and set
   its Base URL to `http://localhost:3000`. This is a per-module setting on the
   environment itself, not a variable — every request under that module is
   automatically sent to this URL, so you never need a `{{baseUrl}}` variable or
   reference it in any request.
3. Below that, in the **Variables** section, add these variables. Enter every
   value in the **Local Value** column (the right-hand column in the Variables
   table) — that is the column an active `Local` environment actually reads
   from. The **Shared Value** column (to its left) is a separate,
   environment-independent default that only matters if you want the same value
   to apply across multiple environments; leave it empty unless you deliberately
   want that.

| Variable        | Local Value                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `userEmail`     | `tester.1@example.com` (or your own registered account)                 |
| `userPassword`  | `TesterPass123!`                                                        |
| `bearerToken`   | _(leave blank)_                                                         |
| `adminEmail`    | `admin@example.com` (registered, then promoted via `PUT /api/users/me`) |
| `adminPassword` | `AdminPass123!`                                                         |
| `adminToken`    | _(leave blank)_                                                         |
| `productId`     | _(leave blank)_                                                         |
| `orderId`       | _(leave blank)_                                                         |

4. Save. Select `Local` as the active environment. All variables — regular user
   and admin — live in this one environment, since a scenario needing both
   tokens in the same run (see Step 10) requires them to be active
   simultaneously.
5. Open any endpoint (e.g. `GET /api/products`) and confirm the request URL
   preview shows the full URL resolved against the module's configured Base URL.

## Step 3 — First "hello world" against the running server

1. Open `GET /api/products`.
2. Click **Send**.
3. Expected: `200 OK`, response body is a JSON array (may be empty if the DB has
   no products).
4. If this fails, fix it before continuing. The rest of the guide assumes the
   backend is reachable.

## Step 4 — Configure the chained-token hook on `POST /api/login`

The hook writes the JWT from the login response into the `bearerToken`
environment variable so every later request can reuse it. The processor must be
configured **before** you send the request — configuring it after would mean the
first login's response is thrown away with nowhere to write the token.

**A. Configure the request body.**

1. Open `POST /api/login`.
2. In the request body, use these values (referencing environment variables, not
   literals):

```json
{
    "email": "{{userEmail}}",
    "password": "{{userPassword}}"
}
```

**B. Add the Store Variable post-processor — do this before sending anything.**

3. Open the **Post Processors** tab on the request (next to Body, Headers,
   Cookies, Auth, Pre Processors).
4. Add a processor. Its name in the UI is **Store Variable** (not "Extract
   Variable").
5. Configure it exactly as follows:

| Field          | Value                                        |
| -------------- | -------------------------------------------- |
| Variable Name  | `bearerToken`                                |
| Variable Scope | Environment Variables                        |
| Source         | Response JSON                                |
| Extract        | JSONPath _(radio button, not "Entire JSON")_ |
| JSONPath       | `$.token`                                    |
| Unwrap Array   | leave off                                    |

This writes the extracted value into `bearerToken`'s **Local Value** cell in the
active environment (`Local`) — the same column you filled in manually in Step 2,
now populated automatically.

> **Naming note:** `bearerToken` matches Apidog's auto-generated default
> variable name for the `bearerAuth` security scheme (visible in each request's
> Auth tab after OpenAPI import). Using this name — rather than a custom one
> like `accessToken` — means every endpoint's scheme-direct binding resolves
> correctly on its own, with no folder-level Auth override needed. Naming it
> something else silently breaks auth on any endpoint bound to the Apidog
> default, producing a 403 that looks like an auth-logic bug rather than a
> naming mismatch. See `Material/Document/SUT-Reference/EShop_Failure_Modes.md`, FM-01.

**C. Now send and verify.**

6. Click **Send**. Expected: `200 OK` with the token in the body.
7. Open the environment panel (Step 2's table). Confirm `bearerToken`'s **Local
   Value** cell now holds the JWT — it should no longer say "Follows initial
   value."

## Step 5 — Verify auth resolves correctly, with no folder-level override

No manual auth wiring is needed at this point — the import settings from Step 1
already handle it. Protected endpoints (those with
`security: [{ bearerAuth: [] }]` in the spec) bind directly to the `bearerAuth`
scheme, which resolves `{{bearerToken}}` automatically now that the variable
name matches Apidog's default. Public endpoints (`security: []`) default to
Inherit from parent, and since Root's Auth is left unconfigured, they correctly
fall back to No Auth.

Do **not** set Bearer Token on the top-level project folder. An earlier version
of this setup did that as a workaround before the `bearerToken` rename; it is
unnecessary now and can cause public endpoints to inherit an auth header they
don't need if reintroduced. If a Root-level Auth override exists from earlier
troubleshooting, remove it.

1. Verify a protected endpoint: open `GET /api/users/me` → **Send** → expected
   `200 OK` with a user record (this confirms scheme-direct-binding resolved
   `{{bearerToken}}` correctly).
2. Verify a public endpoint: open `GET /api/products` → **Send** → expected
   `200 OK` with the product array, no Bearer header sent.
3. If either fails, check the specific request's **Auth** tab — it should read
   either "Corresponding security scheme" (protected) or "Inherit from parent"
   (public), not a stale per-request override. See `Material/Document/SUT-Reference/EShop_Failure_Modes.md`,
   FM-01, for the diagnosis path if a `403` appears here.

## Step 6 — Add the four-scenario matrix to one endpoint (`POST /api/cart`)

Do the pattern once end-to-end here. Steps 7 and 8 apply it to the other
endpoints.

**Finding the Test Cases tab.** Open any endpoint (here, `POST /api/cart`).
Along the top of the endpoint's page is a row of tabs: **Request | Design |
Preview | Test Cases | Mock**. Click **Test Cases**. Inside that tab is a second
row of category filters: **All | Positive | Negative | Boundary | Security |
Other** — these are Apidog's built-in case categories, and they map onto the
four-scenario matrix as follows:

| Scenario matrix case                                              | Apidog category |
| ----------------------------------------------------------------- | --------------- |
| Success (happy path)                                              | **Positive**    |
| Invalid auth                                                      | **Security**    |
| Invalid parameter — boundary value (e.g. quantity = 0)            | **Boundary**    |
| Invalid parameter — wrong class (e.g. quantity = -1) or not found | **Negative**    |

If the tab shows "No test cases available yet," you'll see two buttons:
**Generate with AI** (skip this for now — that's Friday's work) and **+ Add
Case**. Click **+ Add Case**.

**Confirm the canonical request body matches the schema before creating cases:**

```json
{
    "id": 1,
    "name": "Sample Product",
    "price": 100000,
    "quantity": 1
}
```

**Creating each case.** Clicking **+ Add Case** opens a case editor with a
**Case Name** field at the top, a category dropdown next to it (defaults to
Positive — change per the table above), and the same
Params/Body/Headers/Cookies/Auth/Pre Processors/Post Processors tabs as a normal
request. Naming convention — keep the case name short and specific, since the
category already labels the scenario type:

| Case                             | Category | Case Name                      |
| -------------------------------- | -------- | ------------------------------ |
| 1 — Success                      | Positive | `Valid item, quantity 1`       |
| 2 — Invalid auth                 | Security | `Missing Authorization header` |
| 3 — Invalid parameter (boundary) | Boundary | `Quantity = 0`                 |
| 4 — Not found                    | Negative | `Nonexistent product id`       |

For each case, set the **Body** tab to the JSON below, then configure
**Assertions** (next section) before saving.

**Case 1 — Success.** Body as the canonical JSON above.

**Case 2 — Invalid auth.** Same body. Open the case's **Auth** tab and override
it to **No Auth** for this case only — this is a per-case override and does not
affect the endpoint's default scheme-direct binding from Step 5.

**Case 3 — Invalid parameter (boundary).** Body with `"quantity": 0`, everything
else valid.

**Case 4 — Not found.** Body with `"id": 999999`, everything else valid.

## Step 6a — Setting up assertions (applies to every case above)

**Where assertions live.** Inside an open case, click the **Post Processors**
tab (same tab type as the login hook from Step 4, used differently here). Two
mechanisms live in this tab:

1. **Response validation (Contract testing)** — a toggle near the top, paired
   with a status-code selector (e.g. `200 (200)`). Turn this **ON** and pick the
   case's expected status code. This automatically validates the response body
   against the OpenAPI schema Apidog generated from `EShop_OpenApi.yaml` for
   that status — it replaces writing a manual "response matches schema"
   assertion.
2. **Assertion post-processors** — individual checks you add explicitly. Click
   **Add PostProcessor** → choose **Assertion**. Each one has:
    - **Name** — a short label (freeform; only shown in the case's processor
      list).
    - **Target Object** — a dropdown: `HTTP Code`, `Response Header`, and others
      (e.g. response body / JSONPath) not yet confirmed against this screenshot
      set — if you see additional options, they'll follow the same pattern.
    - If Target Object is `Response Header`, a **Header** field appears — type
      the header name (e.g. `Content-Type`).
    - An **Assertion** row at the bottom: a comparison operator dropdown
      (`Equals` confirmed; check for `Contains`/others when you get there) and
      the expected value.

**Recipe — status code assertion** (use on every case, swap the expected value):

- Add PostProcessor → Assertion → Name: `Status` → Target Object: `HTTP Code` →
  Assertion: `Equals` → value: the case's expected status (`200`, `401`, `400`,
  etc.).

**Recipe — Content-Type header assertion** (Case 1, and any case expecting
JSON):

- Add PostProcessor → Assertion → Name: `Content-Type` → Target Object:
  `Response Header` → Header: `Content-Type` → Assertion: `Equals` → value:
  `application/json` (use `Contains` instead of `Equals` if the header includes
  a charset suffix like `application/json; charset=utf-8` and `Equals` fails).

**Recipe — response body field assertion** (Case 1's `message` field, or any
case needing to check body content): if Target Object offers a body/JSONPath
option, follow the same pattern — Name: e.g. `Message` → Target Object: the
body/JSONPath option → path `$.message` → Assertion: `Equals` → value:
`Added to cart`. Confirm the exact Target Object label once you're in the UI; it
wasn't visible in the screenshots reviewed so far.

Apply Case 1's two recipes (Status + Content-Type, plus the body-field check) as
written. For Cases 2–4, use only the Status assertion and, where relevant, a
body-field check for the `error` field's presence rather than an exact value
(since error messages vary by case).

4. Run all four cases. Log any deviations in `Material/Document/SUT-Reference/EShop_Defect.md`.

## Step 7 — Replicate the matrix for the other core endpoints

Apply the same mechanics from Step 6/6a — case creation, category selection,
Response validation toggle, Assertion post-processors — to every remaining
endpoint. The concrete case names, bodies, auth, and expected status for **all
31 operations** are in `Material/Document/Apidog/EShop_Apidog_TestCases.md`; that file is the reference
to work through here, endpoint by endpoint. It also flags which expected
outcomes are known SUT defects (so a "wrong-looking" 200 is often the _correct_
thing to assert) and which are unconfirmed and worth verifying as you go.

**Single-fault-mode discipline:** every invalid-case body mutates exactly one
field or one value; everything else stays valid. Two mutations at once means a
failure cannot be attributed to a single cause.

Two cases in that reference carry real risk — read their notes before running
them: the login-lockout case will lock whatever account you use for 180 seconds
(use a throwaway account), and the admin self-delete case will delete your real
admin account if you don't use a disposable one.

## Step 8 — Add a business-rule assertion where the schema is not enough

Schema-level assertions (Step 6a's "Response validation" toggle) prove the
response has the right shape. Business rules — invariants involving arithmetic
or relationships between fields — need a different mechanism: a **Script**
post-processor, not the UI-driven **Assertion** post-processor from Step 6a.
Both live under the same **Post Processors** tab; when you click **Add
PostProcessor**, look for a **Script** option alongside **Assertion** and choose
that instead.

Add this script to the `POST /api/apply-coupon` success case's Post Processors →
Script:

```js
pm.test('Final amount equals total minus discount', () => {
    const body = pm.response.json()
    pm.expect(body.final_amount).to.equal(
        body.total_amount - body.discount_amount
    )
})
```

This is the kind of check AI-generated tests will typically not produce — it
encodes an invariant the schema cannot express.

## Step 9 — Build the "happy-path purchase" scenario

The first multi-step scenario. Uses Apidog **Test Scenarios** to chain requests.

1. Left sidebar → **Test Scenarios** → **New Scenario** → name it
   `Happy Path Purchase`.
2. Add steps in this order:
    1. `POST /api/login` (uses `{{userEmail}}`, `{{userPassword}}`)
    2. `GET /api/products` — add a post-processor extracting `$[0].id` into
       environment variable `productId`.
    3. `POST /api/cart` — body uses `{{productId}}`.
    4. `POST /api/checkout` — supply a `total_amount` and `shipping_address`.
       Add a post-processor extracting `$.orderId` into `orderId`.
    5. `GET /api/orders/my-orders` — assert that the order with id `{{orderId}}`
       appears in the response array.
3. Run the scenario. All five steps should succeed in sequence.
4. Reset the environment variables (clear `bearerToken`, `productId`, `orderId`)
   and run again — it should still pass cold. (`adminToken` is not used by this
   scenario.)

## Step 10 — Build the "order state machine" scenario

1. New Scenario → `Order State Machine`.
2. Add an **admin login step** at the start, mirroring Step 4's pattern:
    - `POST /api/login` with body
      `{ "email": "{{adminEmail}}", "password": "{{adminPassword}}" }`.
    - **Store Variable** post-processor → Variable Name `adminToken` → Variable
      Scope Environment Variables → Source Response JSON → Extract JSONPath →
      JSONPath `$.token` (same fields as Step 4, but target `adminToken` instead
      of `bearerToken` — keep the two tokens separate).
3. Run `Happy Path Purchase` next (to produce a fresh `orderId`) — this uses the
   regular user's `bearerToken`, unaffected by the admin login above.
4. Walk the transitions with `PUT /api/admin/orders/{{orderId}}/status`. **On
   each of these steps, override the request's Auth tab to Bearer Token →
   `{{adminToken}}`** — do not leave it on the scheme default. The scheme-direct
   binding from Step 5 resolves to `{{bearerToken}}` (the regular user's token)
   for any endpoint declaring `security: [{ bearerAuth: [] }]`, admin or not,
   since the OpenAPI spec has no way to express "must be admin" — only "must
   have a valid token." Functionally either token would work here too, since the
   SUT doesn't check role on admin endpoints (a documented defect — see
   `Material/Document/SUT-Reference/EShop_Defect.md`), but using `{{adminToken}}` demonstrates the intended flow
   rather than relying on the bug.
    1. `{ "status": "confirmed" }` → assert 200.
    2. `{ "status": "shipping" }` → assert 200.
    3. `{ "status": "delivered" }` → assert 200.
5. Add one illegal-transition step: try `{ "status": "delivered" }` on a fresh
   `pending` order → assert `400`.

## Step 11 — Build the "coupon flow" scenario

1. New Scenario → `Coupon Flow`.
2. Steps:
    1. `POST /api/login`.
    2. `POST /api/apply-coupon` with a known-good code (create one first via
       `POST /api/admin/coupons` if needed).
    3. Assert `final_amount = total_amount − discount_amount` (the script
       assertion from Step 8).
3. Record the actual `final_amount` returned. The percent-formula defect will
   surface here — document the observed values verbatim in `Material/Document/SUT-Reference/EShop_Defect.md` and
   in the User Guide's Failure Modes section.

## Step 12 — Cold-run verification

The final gate before Step 13's export.

1. Environment panel → clear `bearerToken`, `adminToken`, `productId`,
   `orderId`.
2. Run every Test Case in the whole collection, then the three scenarios.
3. Expected outcome:
    - Every Case 1 (success) returns 2xx.
    - Every Case 2 (invalid auth) returns 401.
    - Every Case 3/4 (invalid param / not found) returns 4xx with a
      schema-matching error body.
    - All three scenarios complete without human intervention.
4. Any deviation is either an Apidog misconfiguration (fix it here) or a SUT
   defect (log it in `Material/Document/SUT-Reference/EShop_Defect.md`, do not "fix" the test to pass).

## Step 13 — Export and back up

Apidog projects can be lost when local storage is cleared. Export before every
session ends.

1. Project settings → **Export** → format `Apidog JSON` (or OpenAPI + separate
   scenario JSON — depends on Apidog version).
2. Commit the export next to `EShop_OpenApi.yaml` under version control.
3. Keep a second copy of just the environment variables (`Local.json`)
   separately — Apidog exports sometimes strip these.

This concludes the Apidog manual setup. The next work group in the action plan
is Step 14 onward — Apidog AI generation from the same YAML, followed by the
hand-vs-AI diff.
