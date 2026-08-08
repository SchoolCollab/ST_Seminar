# EShop Apidog — Test Case Reference (All Endpoints)

## Overview

Per-endpoint reference for every test case across all 31 operations in
`EShop_OpenApi.yaml`. `Material/Document/Apidog/EShop_Apidog_Steps.md` (Step 6/6a) explains _how_ to
configure a case in Apidog once, in full detail, using `POST /api/cart` as the
worked example; this document is _what values to use_ for every other endpoint,
and — as of this revision — _exactly which assertions and processors each case
needs_, so no case is left to interpretation when you build it.

**Case naming and categories** map the four-scenario matrix onto Apidog's
built-in case categories:

| Scenario                                      | Category |
| --------------------------------------------- | -------- |
| Success (happy path)                          | Positive |
| Invalid auth                                  | Security |
| Invalid parameter — boundary value            | Boundary |
| Invalid parameter — wrong class, or not found | Negative |

**"(defect demo)" tag.** Several endpoints have almost no input validation or
auth enforcement (see `Material/Document/SUT-Reference/EShop_Defect.md`). For these, the expected outcome is
often a **200 that shouldn't happen** — the case exists to catch and document
the defect. Every such case cites the relevant entry in `Material/Document/SUT-Reference/EShop_Defect.md`.

**Unconfirmed outcomes** are marked **(verify)** — inferred from the SUT's
general validation pattern, not confirmed against a specific line of
`server.js`.

**Single-fault-mode discipline** still applies: every invalid case mutates
exactly one field from a valid baseline.

## Assertion and processor shorthand

Every case below specifies its **Assertions** and **Processors** explicitly,
using this notation (all mechanisms are described in full in
`Material/Document/Apidog/EShop_Apidog_Steps.md`, Step 6a):

| Shorthand                    | Means                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RV@<code>`                  | Turn on the **Response validation (Contract testing)** toggle; set the expected status to `<code>`. Auto-validates the response body against the OpenAPI schema. |
| `Status=<code>`              | **Assertion** post-processor — Name `Status`, Target Object `HTTP Code`, Equals `<code>`.                                                                        |
| `CT=<value>`                 | **Assertion** post-processor — Name `Content-Type`, Target Object `Response Header`, Header `Content-Type`, Equals `<value>`.                                    |
| `CT≠json`                    | **Assertion** post-processor asserting `Content-Type` does **not** equal `application/json` — used only on the one case that expects an HTML error body.         |
| `Body:<path> Equals <value>` | **Assertion** post-processor targeting the response body at `<path>` (unconfirmed exact Target Object label — see Step 6a's note on this).                       |
| `Script: <description>`      | **Script** post-processor (raw JS) — for invariants the UI-driven Assertion can't express.                                                                       |
| `Post: <var> ← $.<path>`     | **Post-Processor (Store Variable)** — Environment scope, writes the response's `<path>` into environment variable `<var>`.                                       |
| `None`                       | No pre/post processor is needed for this case — stated explicitly, not left blank.                                                                               |

No case in this document omits an Assertions or Processors value — where nothing
is needed, it says `None` rather than leaving the cell empty.

---

## Authentication

### `POST /api/register`

| Case                     | Category               | Body                                                                                        | Assertions             | Processors                                               | Notes                                                                        |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Success                  | Positive               | `{ "name": "New Tester", "email": "tester.new@example.com", "password": "TesterPass123!" }` | `Status=200`; `RV@200` | `Post: newUserId ← $.id` (capture for any later cleanup) |                                                                              |
| Malformed email accepted | Negative (defect demo) | Same, `email: "not-an-email"`                                                               | `Status=200`           | `None`                                                   | No email-format validation implemented — see `Material/Document/SUT-Reference/EShop_Defect.md`. **(verify)** |
| Duplicate email accepted | Negative (defect demo) | Same, `email: "tester.1@example.com"`                                                       | `Status=200`           | `None`                                                   | No unique constraint on email — see `Material/Document/SUT-Reference/EShop_Defect.md`.                       |

### `POST /api/login`

| Case                            | Category               | Body                                                                           | Assertions                      | Processors                                                           | Notes                                                       |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Success                         | Positive               | `{{userEmail}}` / `{{userPassword}}`                                           | `Status=200`; `RV@200`          | `Post: bearerToken ← $.token` (the standing login hook — see Step 4) |                                                             |
| Wrong password                  | Negative               | Valid email, `password: "WrongPass!"`                                          | `Status=401`                    | `None`                                                               |                                                             |
| Unknown email                   | Negative               | `email: "nobody@example.com"`, any password                                    | `Status=401`                    | `None`                                                               | Same message as wrong password.                             |
| Lockout after 2 failed attempts | Security (defect demo) | Two consecutive wrong-password requests, then a third with correct credentials | `Status=403` on the 3rd request | `None`                                                               | Use a disposable throwaway account — see `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `POST /api/forgot-password`

| Case               | Category | Body                                | Assertions             | Processors                                                                          | Notes                                                             |
| ------------------ | -------- | ----------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Success            | Positive | `{ "email": "{{userEmail}}" }`      | `Status=200`; `RV@200` | `Post: resetToken ← $.resetToken` (needed by the reset-password success case below) | `resetToken` is 4 digits, not ≥6 — defect, see `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Unregistered email | Negative | `{ "email": "nobody@example.com" }` | `Status=404`           | `None`                                                                              |                                                                   |

### `POST /api/reset-password`

| Case        | Category | Body                                                                   | Assertions             | Processors | Notes                                                                                           |
| ----------- | -------- | ---------------------------------------------------------------------- | ---------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Success     | Positive | `email`, `{{resetToken}}` from the forgot-password case, `newPassword` | `Status=200`; `RV@200` | `None`     | Chain after the forgot-password success case, or paste the token manually for a standalone run. |
| Wrong token | Negative | Same email, `resetToken: "0000"`                                       | `Status=400`           | `None`     |                                                                                                 |

---

## Users

### `GET /api/users/me`

| Case    | Category | Auth              | Assertions                                                                                              | Processors | Notes                  |
| ------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| Success | Positive | `{{bearerToken}}` | `Status=200`; `Body:$.password Exists` (documents SEC-01 — asserting the leak is _present_, not absent) | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| No auth | Security | No Auth override  | `Status=401`                                                                                            | `None`     |                        |

### `PUT /api/users/me`

| Case                     | Category               | Body                                                                                                               | Auth              | Assertions             | Processors | Notes                                                                                                                                                    |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                  | Positive               | `{ "name": "Tester One Updated", "shipping_address": "123 Test Street, District 1, HCMC", "phone": "0912345678" }` | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     |                                                                                                                                                          |
| Malformed phone accepted | Boundary (defect demo) | Same, `phone: "12345"`                                                                                             | `{{bearerToken}}` | `Status=200`           | `None`     | **(verify)** — if 400, re-classify as a real boundary check.                                                                                             |
| Role injection           | Security (defect demo) | `{ "role": "admin" }`                                                                                              | `{{bearerToken}}` | `Status=200`           | `None`     | SEC-06 — this is the mechanism used to bootstrap the admin account. Re-login afterward for a fresh token reflecting the new role. See `Material/Document/SUT-Reference/EShop_Defect.md`. |

---

## Products

### `GET /api/products`

| Case                  | Category               | Query                    | Assertions                                    | Processors                                                                              | Notes                                                       |
| --------------------- | ---------------------- | ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Success               | Positive               | _(none)_                 | `Status=200`; `RV@200`; `CT=application/json` | `Post: productId ← $[0].id` (feeds every later case that needs a known-good product id) |                                                             |
| Empty result          | Boundary               | `search=zzz_nonexistent` | `Status=200`; `Body:$ Equals []`              | `None`                                                                                  |                                                             |
| SQL injection payload | Security (defect demo) | `search=' OR '1'='1`     | `Status=500`; `CT≠json`                       | `None`                                                                                  | SEC-05 — response is HTML, not JSON. See `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `GET /api/products/{id}`

| Case                 | Category               | Path        | Assertions                               | Processors | Notes                              |
| -------------------- | ---------------------- | ----------- | ---------------------------------------- | ---------- | ---------------------------------- |
| Success (odd id)     | Positive               | `id=1`      | `Status=200`; `Body:$.price Type=number` | `None`     |                                    |
| Type quirk (even id) | Boundary (defect demo) | `id=2`      | `Status=200`; `Body:$.price Type=string` | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.             |
| Not found            | Negative (defect demo) | `id=999999` | `Status=200`; `Body:$ Equals {}`         | `None`     | Not `404` — see `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `POST /api/products`

| Case                   | Category               | Body                                                            | Auth              | Assertions             | Processors                                                              | Notes                                                              |
| ---------------------- | ---------------------- | --------------------------------------------------------------- | ----------------- | ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Success                | Positive               | `{ "name": "Test Product", "price": 100000, "category_id": 1 }` | `{{bearerToken}}` | `Status=200`; `RV@200` | `Post: createdProductId ← $.id` (useful for the PUT/DELETE cases below) |                                                                    |
| No auth still succeeds | Security (defect demo) | Same                                                            | No Auth override  | `Status=200`           | `None`                                                                  | Spec says admin-only; SUT enforces nothing. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Zero price accepted    | Boundary (defect demo) | `price: 0`, rest valid                                          | `{{bearerToken}}` | `Status=200`           | `None`                                                                  | **(verify)**                                                       |

### `PUT /api/products/{id}`

| Case                    | Category               | Body                                                                    | Auth              | Assertions             | Processors | Notes                                                                 |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------- | ----------------- | ---------------------- | ---------- | --------------------------------------------------------------------- |
| Success                 | Positive               | `{ "name": "Test Product Updated", "price": 120000, "category_id": 1 }` | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     | Use `{{createdProductId}}` from the POST success case as the path id. |
| No auth still succeeds  | Security (defect demo) | Same                                                                    | No Auth override  | `Status=200`           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                |
| Negative price accepted | Boundary (defect demo) | `price: -1`, rest valid                                                 | `{{bearerToken}}` | `Status=200`           | `None`     | **(verify)**                                                          |

### `DELETE /api/products/{id}`

| Case                     | Category               | Path                                       | Auth              | Assertions                                              | Processors | Notes                                                |
| ------------------------ | ---------------------- | ------------------------------------------ | ----------------- | ------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| Success                  | Positive               | `{{createdProductId}}`                     | `{{bearerToken}}` | `Status=200`; `RV@200`                                  | `None`     |                                                      |
| No auth still succeeds   | Security (defect demo) | A separately-created disposable product id | No Auth override  | `Status=200`                                            | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                               |
| Nonexistent id still 200 | Negative (defect demo) | `id=999999`                                | `{{bearerToken}}` | `Status=200`; `Body:$.message Equals "Product deleted"` | `None`     | Nothing was actually deleted. See `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `POST /api/admin/import-products`

| Case                         | Category               | Body                                                            | Auth                             | Assertions                               | Processors | Notes                                                                               |
| ---------------------------- | ---------------------- | --------------------------------------------------------------- | -------------------------------- | ---------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| All valid                    | Positive               | Two valid products (`allValid` example in `EShop_OpenApi.yaml`) | `{{adminToken}}`                 | `Status=200`; `RV@200`                   | `None`     | Reported `inserted` count may be wrong — async callback bug, see `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Partial invalid, no rollback | Negative (defect demo) | One row missing `name` (`partiallyInvalid` example)             | `{{adminToken}}`                 | `Status=200`; `Body:$.inserted Equals 1` | `None`     | FR-16 requires all-or-nothing. See `Material/Document/SUT-Reference/EShop_Defect.md`.                               |
| No admin-role check          | Security (defect demo) | Same as "All valid"                                             | `{{bearerToken}}` (regular user) | `Status=200`                             | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                              |

---

## Categories

### `GET /api/categories`

| Case    | Category | Assertions                                    | Processors | Notes |
| ------- | -------- | --------------------------------------------- | ---------- | ----- |
| Success | Positive | `Status=200`; `RV@200`; `CT=application/json` | `None`     |       |

### `POST /api/categories`

| Case                | Category               | Body                          | Auth              | Assertions             | Processors                                                      | Notes                                                   |
| ------------------- | ---------------------- | ----------------------------- | ----------------- | ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Success             | Positive               | `{ "name": "Test Category" }` | `{{bearerToken}}` | `Status=200`; `RV@200` | `Post: createdCategoryId ← $.id` (feeds PUT/DELETE cases below) |                                                         |
| Empty name accepted | Boundary (defect demo) | `{ "name": "" }`              | `{{bearerToken}}` | `Status=200`           | `None`                                                          | **(verify)**                                            |
| No auth             | Security               | Same as success               | No Auth override  | `Status=401`           | `None`                                                          | Unlike Products, Categories does enforce a valid token. |

### `PUT /api/categories/{id}`

| Case           | Category | Body                                  | Auth              | Assertions                             | Processors | Notes                                       |
| -------------- | -------- | ------------------------------------- | ----------------- | -------------------------------------- | ---------- | ------------------------------------------- |
| Success        | Positive | `{ "name": "Test Category Renamed" }` | `{{bearerToken}}` | `Status=200`; `RV@200`                 | `None`     | Use `{{createdCategoryId}}` as the path id. |
| No auth        | Security | Same                                  | No Auth override  | `Status=401`                           | `None`     |                                             |
| Nonexistent id | Negative | `id=999999`                           | `{{bearerToken}}` | `Status=` **(verify — record actual)** | `None`     | Not confirmed against source.               |

### `DELETE /api/categories/{id}`

| Case           | Category | Auth                           | Assertions                             | Processors | Notes                        |
| -------------- | -------- | ------------------------------ | -------------------------------------- | ---------- | ---------------------------- |
| Success        | Positive | `{{bearerToken}}`              | `Status=200`; `RV@200`                 | `None`     | Use `{{createdCategoryId}}`. |
| No auth        | Security | No Auth override               | `Status=401`                           | `None`     |                              |
| Nonexistent id | Negative | `{{bearerToken}}`, `id=999999` | `Status=` **(verify — record actual)** | `None`     |                              |

---

## Cart

### `GET /api/cart`

| Case    | Category | Auth              | Assertions             | Processors | Notes                |
| ------- | -------- | ----------------- | ---------------------- | ---------- | -------------------- |
| Success | Positive | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     | Array, may be empty. |
| No auth | Security | No Auth override  | `Status=401`           | `None`     |                      |

### `POST /api/cart`

Fully worked in `Material/Document/Apidog/EShop_Apidog_Steps.md`, Step 6/6a — repeated here for a
complete per-endpoint reference, values identical.

| Case                         | Category | Body                                                                    | Auth              | Assertions                                                                   | Processors | Notes                                                                                                                               |
| ---------------------------- | -------- | ----------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Success                      | Positive | `{ "id": 1, "name": "Sample Product", "price": 100000, "quantity": 1 }` | `{{bearerToken}}` | `Status=200`; `CT=application/json`; `Body:$.message Equals "Added to cart"` | `None`     |                                                                                                                                     |
| Missing Authorization header | Security | Same body                                                               | No Auth override  | `Status=401`                                                                 | `None`     |                                                                                                                                     |
| Quantity = 0                 | Boundary | Same, `quantity: 0`                                                     | `{{bearerToken}}` | `Status=400`                                                                 | `None`     |                                                                                                                                     |
| Nonexistent product id       | Negative | Same, `id: 999999`                                                      | `{{bearerToken}}` | `Status=` **(verify — record actual)**                                       | `None`     | `POST /api/cart` pushes `req.body` verbatim with no existence check — likely 200 with a nonsense entry. If so, log as a new defect. |

---

## Orders

### `POST /api/checkout`

| Case                             | Category               | Body                                                                                  | Auth              | Assertions                            | Processors                                                                                                | Notes                                                                                                 |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- | ----------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Success                          | Positive               | `{ "total_amount": 100000, "shipping_address": "123 Test Street, District 1, HCMC" }` | `{{bearerToken}}` | `Status=200`; `RV@200`                | `Post: orderId ← $.orderId` (feeds the Orders cases below)                                                | Field is `orderId` (camelCase) — confirmed via Pact; see `Material/Document/SUT-Reference/EShop_Defect.md`'s naming-convention entry. |
| No auth                          | Security               | Same                                                                                  | No Auth override  | `Status=401`                          | `None`                                                                                                    |                                                                                                       |
| Client-controlled total accepted | Negative (defect demo) | `total_amount: 1`, rest valid                                                         | `{{bearerToken}}` | `Status=200`; `Body:$.orderId Exists` | `Post: cheapOrderId ← $.orderId` (to inspect the stored total afterward, e.g. via `GET /api/orders/{id}`) | FR-08 — backend trusts the client value. See `Material/Document/SUT-Reference/EShop_Defect.md`.                                       |

### `GET /api/orders/my-orders`

| Case    | Category | Auth              | Assertions             | Processors | Notes |
| ------- | -------- | ----------------- | ---------------------- | ---------- | ----- |
| Success | Positive | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     |       |
| No auth | Security | No Auth override  | `Status=401`           | `None`     |       |

### `PUT /api/orders/{id}/cancel`

| Case                             | Category               | Path/State                                                                  | Auth              | Assertions             | Processors | Notes                                         |
| -------------------------------- | ---------------------- | --------------------------------------------------------------------------- | ----------------- | ---------------------- | ---------- | --------------------------------------------- |
| Success (pending)                | Positive               | `{{orderId}}`, freshly `pending`                                            | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     |                                               |
| Cancel a shipping order accepted | Negative (defect demo) | An order in `shipping` status (transition it first via admin status-update) | `{{bearerToken}}` | `Status=200`           | `None`     | Should be 400 — FR-10. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Already canceled/delivered       | Negative               | An order already `canceled` or `delivered`                                  | `{{bearerToken}}` | `Status=400`           | `None`     | This guard works correctly.                   |
| No auth                          | Security               | Any order id                                                                | No Auth override  | `Status=401`           | `None`     |                                               |
| Not found                        | Negative               | `id=999999`                                                                 | `{{bearerToken}}` | `Status=404`           | `None`     |                                               |

### `GET /api/orders/{id}`

| Case          | Category               | Path                           | Auth                                         | Assertions             | Processors | Notes                                                      |
| ------------- | ---------------------- | ------------------------------ | -------------------------------------------- | ---------------------- | ---------- | ---------------------------------------------------------- |
| Success       | Positive               | `{{orderId}}` (your own order) | `{{bearerToken}}`                            | `Status=200`; `RV@200` | `None`     |                                                            |
| No-auth-check | Security (defect demo) | Any existing order id          | No Auth override                             | `Status=200`           | `None`     | Should require ownership per FR-11. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Not found     | Negative               | `id=999999`                    | No Auth needed (endpoint is unauthenticated) | `Status=404`           | `None`     |                                                            |

---

## Coupons

### `GET /api/coupons`

| Case    | Category | Auth                             | Assertions             | Processors | Notes                                                                        |
| ------- | -------- | -------------------------------- | ---------------------- | ---------- | ---------------------------------------------------------------------------- |
| Success | Positive | `{{bearerToken}}` (regular user) | `Status=200`; `RV@200` | `None`     | Spec says admin-only; SUT only checks token validity. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| No auth | Security | No Auth override                 | `Status=401`           | `None`     |                                                                              |

### `POST /api/apply-coupon`

| Case                              | Category               | Body                                                                | Assertions                                                                                                     | Processors | Notes                                                                                                                                                                |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                           | Positive               | `{ "code": "SAVE10", "total_amount": 500000, "user_id": 1 }`        | `Status=200`; `RV@200`; `Script: final_amount == total_amount − discount_amount` (see Step 8 for the exact JS) | `None`     | Percent formula is inverted — the script assertion will **fail**, which is itself the M6-adjacent evidence. Record the actual `final_amount`. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| Missing code                      | Negative               | `code: ""`, rest valid                                              | `Status=400`                                                                                                   | `None`     |                                                                                                                                                                      |
| Below minimum (off-by-one)        | Boundary (defect demo) | `total_amount` set exactly equal to the coupon's `min_order_amount` | `Status=400`                                                                                                   | `None`     | Should be accepted — SUT uses `>` not `>=`. See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                                                                   |
| `user_id` omitted, limit bypassed | Security (defect demo) | `{ "code": "SAVE10", "total_amount": 500000 }`                      | `Status=200`                                                                                                   | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                                                                                                               |

### `POST /api/coupon-usage`

| Case                      | Category               | Body                                             | Auth              | Assertions             | Processors | Notes                  |
| ------------------------- | ---------------------- | ------------------------------------------------ | ----------------- | ---------------------- | ---------- | ---------------------- |
| Success                   | Positive               | `{ "coupon_id": 1 }`                             | `{{bearerToken}}` | `Status=200`; `RV@200` | `None`     |                        |
| No auth                   | Security               | Same                                             | No Auth override  | `Status=401`           | `None`     |                        |
| No real-order cross-check | Negative (defect demo) | Arbitrary `coupon_id` with no checkout behind it | `{{bearerToken}}` | `Status=200`           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `POST /api/admin/coupons`

| Case                | Category               | Body                                                                                                                                            | Auth                             | Assertions             | Processors                                                   | Notes                       |
| ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------- | ------------------------------------------------------------ | --------------------------- |
| Success             | Positive               | `{ "code": "SAVE10", "type": "percent", "discount_value": 10, "min_order_amount": 200000, "expired_at": "2027-01-31", "max_uses_per_user": 1 }` | `{{adminToken}}`                 | `Status=200`; `RV@200` | `Post: createdCouponId ← $.id` (feeds the DELETE case below) |                             |
| No admin-role check | Security (defect demo) | Same, different `code`                                                                                                                          | `{{bearerToken}}` (regular user) | `Status=200`           | `None`                                                       | See `Material/Document/SUT-Reference/EShop_Defect.md`.      |
| Duplicate code      | Negative               | Reuse an existing `code`                                                                                                                        | `{{adminToken}}`                 | `Status=500`           | `None`                                                       | DB unique-constraint error. |

### `DELETE /api/admin/coupons/{id}`

| Case                | Category               | Auth                             | Assertions                             | Processors | Notes                      |
| ------------------- | ---------------------- | -------------------------------- | -------------------------------------- | ---------- | -------------------------- |
| Success             | Positive               | `{{adminToken}}`                 | `Status=200`; `RV@200`                 | `None`     | Use `{{createdCouponId}}`. |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | `Status=200`                           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.     |
| Not found           | Negative               | `{{adminToken}}`, `id=999999`    | `Status=` **(verify — record actual)** | `None`     |                            |

---

## Admin

### `GET /api/admin/users`

| Case                | Category               | Auth                             | Assertions                                             | Processors | Notes                                                                                                         |
| ------------------- | ---------------------- | -------------------------------- | ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Success             | Positive               | `{{adminToken}}`                 | `Status=200`; `RV@200`; `Body:$[0].password NotExists` | `None`     | Contrast with `GET /api/users/me`, which leaks `password` — worth noting the inconsistency in the User Guide. |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | `Status=200`                                           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                                                        |
| No auth             | Security               | No Auth override                 | `Status=401`                                           | `None`     |                                                                                                               |

### `DELETE /api/admin/users/{id}`

| Case                     | Category               | Path                                                  | Auth                             | Assertions             | Processors | Notes                                                                                                                                |
| ------------------------ | ---------------------- | ----------------------------------------------------- | -------------------------------- | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Success                  | Positive               | A disposable throwaway user's id (register one first) | `{{adminToken}}`                 | `Status=200`; `RV@200` | `None`     | Never run against `tester.1` or your main admin account.                                                                             |
| Self-delete allowed      | Security (defect demo) | The **admin account's own id**                        | `{{adminToken}}`                 | `Status=200`           | `None`     | **Caution:** use a second, disposable admin account for this case — it will actually delete the account used. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| No admin-role check      | Security (defect demo) | Any other disposable user's id                        | `{{bearerToken}}` (regular user) | `Status=200`           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                                                                               |
| Nonexistent id still 200 | Negative (defect demo) | `id=999999`                                           | `{{adminToken}}`                 | `Status=200`           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                                                                                               |

### `GET /api/admin/orders`

| Case                | Category               | Auth                             | Assertions                                           | Processors | Notes                  |
| ------------------- | ---------------------- | -------------------------------- | ---------------------------------------------------- | ---------- | ---------------------- |
| Success             | Positive               | `{{adminToken}}`                 | `Status=200`; `RV@200`; `Body:$[0].user_name Exists` | `None`     |                        |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | `Status=200`                                         | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`. |

### `PUT /api/admin/orders/{id}/status`

Named examples already exist in `EShop_OpenApi.yaml` (`validTransition`,
`illegalTransition`, `bugTransition`) — reuse those bodies directly.

| Case                                    | Category               | Body                        | State of target order | Auth                             | Assertions             | Processors | Notes                                                                |
| --------------------------------------- | ---------------------- | --------------------------- | --------------------- | -------------------------------- | ---------------------- | ---------- | -------------------------------------------------------------------- |
| Valid transition                        | Positive               | `{ "status": "confirmed" }` | `pending`             | `{{adminToken}}`                 | `Status=200`; `RV@200` | `None`     |                                                                      |
| Illegal transition (correctly rejected) | Negative               | `{ "status": "delivered" }` | `pending`             | `{{adminToken}}`                 | `Status=400`           | `None`     | This guard works correctly.                                          |
| Bug: canceled → delivered accepted      | Negative (defect demo) | `{ "status": "delivered" }` | `canceled`            | `{{adminToken}}`                 | `Status=200`           | `None`     | Should be rejected — both should be terminal. See `Material/Document/SUT-Reference/EShop_Defect.md`. |
| No admin-role check                     | Security (defect demo) | `{ "status": "confirmed" }` | `pending`             | `{{bearerToken}}` (regular user) | `Status=200`           | `None`     | See `Material/Document/SUT-Reference/EShop_Defect.md`.                                               |
