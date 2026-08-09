# Track A — Execution Brief (Week 09, M1 + M2)

## Purpose

Ground the four-scenario matrix, the defect-endpoint extensions, and the Happy
Path scenario in what `backend/server.js` **actually returns** — not what the
OpenAPI spec or the SRS says it should. This eliminates every "(verify — record
actual)" placeholder in `Material/Document/Apidog/EShop_Apidog_TestCases.md` for Track A's endpoints, so
Apidog case building is mechanical.

Cross-refs used, all traced back to `server.js` at the line ranges cited:
`server.js` (canonical), `Material/Document/SUT-Reference/EShop_Defect.md`, `EShop_OpenApi.yaml`,
`Material/Document/Apidog/EShop_Apidog_Steps.md` Steps 6/6a and 9, `Material/Document/Apidog/EShop_Apidog_TestCases.md`.

Applies to the six endpoints Track A touches: `GET /api/products` (M1),
`POST /api/cart` (M2 matrix), `GET /api/cart`, `GET /api/users/me`,
`PUT /api/users/me`, `POST /api/checkout`, `GET /api/products/:id`.

## M1 evidence — closure item

Step 3 of `Material/Document/Apidog/EShop_Apidog_Steps.md` is the closure gate. Actions:

1. Backend running: `cd Sut/EShop/backend && npm start` (leave `NODE_ENV` unset
   — the `:memory:` mode is Pact-only).
2. Apidog → active environment `Local` → open `GET /api/products` → **Send**.
3. Expected: `200 OK`, body is a JSON array (may be `[]` if the DB has no
   products yet — that's still a green M1).
4. Screenshot the response tab (status pill + body preview + request URL) to
   `Material/Evidence/M1_hello_world.png`.

If the DB is empty, seed one product first via `POST /api/products` — that's a
public endpoint per `server.js:195`, no auth needed. Body:

```json
{
    "name": "iPhone 15 Pro Max",
    "price": 30000000,
    "description": "Điện thoại cao cấp",
    "imageUrl": "https://placehold.co/300x300/png",
    "category_id": 1
}
```

## POST /api/cart — the four-scenario matrix (M2 core)

### What the server actually does

`server.js:322–327` — authenticate → `userCarts[userId].push(req.body)` → return
`200 { message: "Added to cart" }`. Zero body validation, no product existence
check, no quantity check, no duplicate-merge. This is the documented "accepts
any JSON shape" and "does not merge duplicate product IDs (FR-07)" defect pair
in `Material/Document/SUT-Reference/EShop_Defect.md`.

**Implication for the matrix:** every case that hits the endpoint with a valid
JWT returns `200`, regardless of how mangled the body is. The Boundary and
Negative cases become **defect-demo cases** (Apidog category unchanged), not
`400`/`404` guards.

### Per-case predictions (replaces the current TestCases doc entries)

| Case                            | Category               | Body                                                                    | Auth              | Expected status | Assertions                                                                   | Cross-ref                                                          |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------- | ----------------- | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Success                         | Positive               | `{ "id": 1, "name": "Sample Product", "price": 100000, "quantity": 1 }` | `{{bearerToken}}` | `200`           | `Status=200`; `CT=application/json`; `Body:$.message Equals "Added to cart"` | Baseline                                                           |
| Missing Authorization header    | Security               | Same body                                                               | No Auth override  | `401`           | `Status=401`; `Body:$.error Equals "Unauthorized"`                           | `server.js:127` returns `{"error":"Unauthorized"}` when token null |
| Quantity = 0 accepted           | Boundary (defect demo) | Same, `"quantity": 0`                                                   | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.message Equals "Added to cart"`                        | `Material/Document/SUT-Reference/EShop_Defect.md` — "`POST /api/cart` accepts any JSON shape"      |
| Nonexistent product id accepted | Negative (defect demo) | Same, `"id": 999999`                                                    | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.message Equals "Added to cart"`                        | Same defect entry — no existence check                             |

Both Boundary and Negative cases carry the **defect-demo** tag from
`Material/Document/Apidog/EShop_Apidog_TestCases.md` intro §"(defect demo) tag" — the expected 200 is the
wrong outcome, but it is the observed outcome, and asserting on the observed
outcome is what makes the case fail if the defect is ever fixed.

## Defect-endpoint extension — priority order

Per the W09 plan, extend outward through defect endpoints so cases double as
defect evidence. Order and per-case grounding follows.

### PUT /api/users/me (SEC-06)

**Server:** `server.js:142–159`. Accepts `role` from body; if present,
`UPDATE users SET role = ?`. No admin check.

| Case                            | Category               | Body                                                                        | Auth              | Expected status | Assertions                                              | Cross-ref                  |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------------- | ----------------- | --------------- | ------------------------------------------------------- | -------------------------- |
| Success — normal profile update | Positive               | `{ "name": "Test User", "shipping_address": "1 Main St", "phone": "0900" }` | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.message Equals "Profile updated"` | Baseline                   |
| Self-promotion to admin         | Negative (defect demo) | Add `"role": "admin"` to the Success body                                   | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.message Equals "Profile updated"` | `Material/Document/SUT-Reference/EShop_Defect.md` — SEC-06 |
| No auth                         | Security               | Same as Success                                                             | No Auth override  | `401`           | `Status=401`                                            |                            |

After running the self-promotion case: verify with `GET /api/users/me` that
`role` now reads `"admin"`. This is the standing evidence for SEC-06 and the
mechanism by which the admin account in the environment is provisioned (per
`Material/Document/Apidog/EShop_Apidog_Setup.md`).

### GET /api/users/me (SEC-01)

**Server:** `server.js:136–140`. Returns whole users row including the plaintext
`password` column.

| Case                    | Category               | Auth              | Expected status | Assertions                             | Cross-ref                  |
| ----------------------- | ---------------------- | ----------------- | --------------- | -------------------------------------- | -------------------------- |
| Success — profile fetch | Positive               | `{{bearerToken}}` | `200`           | `Status=200`; `RV@200`                 | Baseline                   |
| Password field leaked   | Security (defect demo) | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.password Exists` | `Material/Document/SUT-Reference/EShop_Defect.md` — SEC-01 |
| No auth                 | Security               | No Auth override  | `401`           | `Status=401`                           |                            |

The `RV@200` toggle on the Success case will _not_ fail on the extra `password`
field — Apidog's schema validation permits unlisted fields (analogous to the
Pact `eachLike` gap noted in `Material/Document/Pact/EShop_Pact_Plan.md` §6). The explicit
`$.password Exists` assertion is what makes SEC-01 catchable.

### POST /api/checkout (FR-08, orderId camelCase)

**Server:** `server.js:329–341`. Stores `total_amount` verbatim (trusts client);
returns `{ message: "Checkout successful", orderId }` — camelCase. Does not
clear the cart.

| Case                             | Category               | Body                                                                                      | Auth              | Expected status | Assertions                                                                           | Processors                                             | Cross-ref                            |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- | ----------------- | --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------ |
| Success                          | Positive               | `{ "total_amount": 100000, "shipping_address": "123 Test Street, District 1, HCMC" }`     | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.orderId Exists`; `Body:$.message Equals "Checkout successful"` | `Store Variable: orderId ← $.orderId`                  | Baseline; note camelCase `orderId`   |
| Client-controlled total accepted | Negative (defect demo) | `total_amount: 1`, rest valid                                                             | `{{bearerToken}}` | `200`           | `Status=200`; `Body:$.orderId Exists`                                                | `Store Variable: cheapOrderId ← $.orderId`             | `Material/Document/SUT-Reference/EShop_Defect.md` — FR-08            |
| Cart not cleared after checkout  | Negative (defect demo) | Success body; run `POST /api/cart` first, then `POST /api/checkout`, then `GET /api/cart` | `{{bearerToken}}` | `200` (on GET)  | On `GET /api/cart`: `Body[0] Exists` (proves the item remains)                       | Multi-request — belongs in a Scenario, not a Test Case | `Material/Document/SUT-Reference/EShop_Defect.md` — FR-08 clear-cart |
| No auth                          | Security               | Success body                                                                              | No Auth override  | `401`           | `Status=401`                                                                         |                                                        |                                      |

The "Cart not cleared" case is genuinely multi-request. Simpler placement: add
it as an extra step in the Happy Path Purchase scenario (below), not as a
standalone Test Case on `POST /api/checkout`.

### GET /api/products/:id (`{}`-on-404 + odd/even price-type quirk)

**Server:** `server.js:200–207`. Two defects in one endpoint:

- Line 205: `if (!row) return res.status(200).json({})` — missing product still
  returns 200 with an empty object body, not 404.
- Line 206: `if (row.id % 2 === 0) row.price = row.price.toString()` — the
  `price` field's _type_ depends on whether the id is even. Even → string. Odd →
  integer.

| Case                               | Category               | Path        | Auth   | Expected status | Assertions                                                 | Cross-ref                                          |
| ---------------------------------- | ---------------------- | ----------- | ------ | --------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| Success (odd id)                   | Positive               | `id=1`      | Public | `200`           | `Status=200`; `RV@200`; `Script: assert price is a number` | Baseline; odd path keeps integer type              |
| Even id — price returned as string | Boundary (defect demo) | `id=2`      | Public | `200`           | `Status=200`; `Script: assert typeof price === 'string'`   | `Material/Document/SUT-Reference/EShop_Defect.md` — even-id price-to-string defect |
| Missing product returns `{}`+200   | Negative (defect demo) | `id=999999` | Public | `200`           | `Status=200`; `Body:$ Equals {}`                           | `Material/Document/SUT-Reference/EShop_Defect.md` — `{}`-on-404 quirk              |

The two defect-demo cases here are also strong AI-diff candidates for Track B.
The completed AI checkpoint generated 22 `GET /api/products/{id}` cases and the
report executed all 22. It produced broad malformed/boundary-id coverage, but
the `id=2` boundary case passed without asserting the even-id price-type quirk,
so that specific defect still needs human-authored oracle coverage.

## Happy Path Purchase scenario — concrete payloads

`Material/Document/Apidog/EShop_Apidog_Steps.md` Step 9 in tightened form, with every request body,
variable extraction, and assertion pinned to what `server.js` returns.

**Prereq environment variables** (per Step 2): `userEmail`, `userPassword`
populated; `bearerToken`, `productId`, `orderId` blank. One product must exist
in the DB (seed via the M1 step above if needed).

| #   | Endpoint                    | Request body                                                                | Auth              | Post-processor                                                | Assertion                                                               |
| --- | --------------------------- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `POST /api/login`           | `{ "email": "{{userEmail}}", "password": "{{userPassword}}" }`              | No Auth           | `Store Variable: bearerToken ← $.token` (already from Step 4) | `Status=200`; `Body:$.token Exists`                                     |
| 2   | `GET /api/products`         | —                                                                           | Public            | `Store Variable: productId ← $[0].id`                         | `Status=200`; response is a non-empty array                             |
| 3   | `POST /api/cart`            | `{ "id": {{productId}}, "name": "Sample", "price": 100000, "quantity": 1 }` | `{{bearerToken}}` | —                                                             | `Status=200`; `Body:$.message Equals "Added to cart"`                   |
| 4   | `POST /api/checkout`        | `{ "total_amount": 100000, "shipping_address": "123 Test, HCMC" }`          | `{{bearerToken}}` | `Store Variable: orderId ← $.orderId`                         | `Status=200`; `Body:$.orderId Exists`                                   |
| 5   | `GET /api/orders/my-orders` | —                                                                           | `{{bearerToken}}` | —                                                             | `Status=200`; response array contains an entry with `id == {{orderId}}` |

**Optional step 6 — defect-evidence extension** (for the "cart not cleared"
FR-08 defect above): add `GET /api/cart` after step 5, assert
`Body:$[0] Exists`. This turns the Happy Path into a mini defect demo without
touching Test Cases.

**Cold-run gate.** Clear `bearerToken`, `productId`, `orderId`, then re-run. All
five (or six with the optional step) must pass. Any red anywhere means either
the environment isn't fully cleared or a step's variable extraction is wrong —
not a SUT change.

## What still requires the GUI

Reading the server pins **outcomes**; it does not build cases in Apidog. What
you still need to do at the GUI, per endpoint above:

1. Open the endpoint's **Test Cases** tab → **+ Add Case** for each row.
2. Set the category from the table column.
3. Paste the body from the table.
4. Set Auth per the "Auth" column (default scheme binding when `{{bearerToken}}`
   is listed; **No Auth override** when literally that).
5. Configure assertions per the "Assertions" column using the shorthand from
   `Material/Document/Apidog/EShop_Apidog_TestCases.md` §"Assertion and processor shorthand".
6. For the Happy Path scenario: **Test Scenarios → New Scenario → Happy Path
   Purchase → Add Step** for each row.
7. Export the project to `Material/Config/` when the endpoint's cases are done —
   Step 13 of `Material/Document/Apidog/EShop_Apidog_Steps.md`.

## Corrections applied to `Material/Document/Apidog/EShop_Apidog_TestCases.md`

The current TestCases doc has two rows on `POST /api/cart` that this brief
overrides: Boundary (Quantity=0) expected `400`, and Negative (Nonexistent
product id) marked `(verify — record actual)`. Both are corrected to `200` with
the defect-demo tag and the `Material/Document/SUT-Reference/EShop_Defect.md` cross-reference. See the diff on
the doc for the exact edit.
