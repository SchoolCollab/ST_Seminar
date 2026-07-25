# EShop Apidog — Test Case Reference (All Endpoints)

## Overview

This is the per-endpoint reference for every test case across all 31 operations
in `EShop_OpenApi.yaml`. `EShop_Apidog_Steps.md` (Step 6/6a) explains _how_ to
configure a case in Apidog once, in full detail, using `POST /api/cart` as the
worked example; this document is _what values to use_ for every other endpoint,
so it assumes that mechanical knowledge and stays terse.

**Case naming and categories** follow the convention from Step 6: short,
specific case names, filed under Apidog's built-in categories (Positive /
Negative / Boundary / Security), mapped from the four-scenario matrix:

| Scenario                                      | Category |
| --------------------------------------------- | -------- |
| Success (happy path)                          | Positive |
| Invalid auth                                  | Security |
| Invalid parameter — boundary value            | Boundary |
| Invalid parameter — wrong class, or not found | Negative |

**"(defect demo)" tag.** Several endpoints have almost no input validation or
auth enforcement (see `EShop_Defect.md`). For these, the "expected" outcome is
often a **200 that shouldn't happen** — the point of the case is to catch and
document the defect, not to confirm normal behaviour. Cases tagged this way
still get an assertion (usually on the status code), but the assertion is
checking that the _defect reproduces_, so a future fix to EShop would correctly
turn this case red. Every such case cites the relevant section of
`EShop_Defect.md`.

**Unconfirmed outcomes.** A few expected values below are inferred from the
SUT's general "little to no validation" pattern rather than confirmed against a
specific line of `server.js`. These are marked **(verify)** — run the case, and
if the real outcome differs, that's useful information: log it in
`EShop_Failure_Modes.md` if it's a testing-tool surprise, or update this doc and
`EShop_Defect.md` if it's a genuine SUT finding.

**Single-fault-mode discipline still applies** — every invalid case below
mutates exactly one field from a valid baseline.

---

## Authentication

### `POST /api/register`

| Case                     | Category               | Body                                                                                        | Expected         | Notes                                                              |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Success                  | Positive               | `{ "name": "New Tester", "email": "tester.new@example.com", "password": "TesterPass123!" }` | 200              |                                                                    |
| Malformed email accepted | Negative (defect demo) | Same, `email: "not-an-email"`                                                               | 200 **(verify)** | No email-format validation is implemented — see `EShop_Defect.md`. |
| Duplicate email accepted | Negative (defect demo) | Same, `email: "tester.1@example.com"` (already registered)                                  | 200              | No unique constraint on email — see `EShop_Defect.md`.             |

### `POST /api/login`

| Case                            | Category               | Body                                                                           | Expected       | Notes                                                                                                                                                                                        |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                         | Positive               | `{{userEmail}}` / `{{userPassword}}`                                           | 200            |                                                                                                                                                                                              |
| Wrong password                  | Negative               | Valid email, `password: "WrongPass!"`                                          | 401            |                                                                                                                                                                                              |
| Unknown email                   | Negative               | `email: "nobody@example.com"`, any password                                    | 401            | Same message as wrong password (correct — avoids leaking which part failed).                                                                                                                 |
| Lockout after 2 failed attempts | Security (defect demo) | Two consecutive wrong-password requests, then a third with correct credentials | 403 on the 3rd | `login_attempts` increments by 2 per failure, not 1 — lockout triggers after 2 tries, not 3. Use a disposable throwaway account for this case; it will lock for 180s. See `EShop_Defect.md`. |

### `POST /api/forgot-password`

| Case               | Category | Body                                | Expected | Notes                                                                         |
| ------------------ | -------- | ----------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Success            | Positive | `{ "email": "{{userEmail}}" }`      | 200      | `resetToken` in response is 4 digits, not ≥6 — defect, see `EShop_Defect.md`. |
| Unregistered email | Negative | `{ "email": "nobody@example.com" }` | 404      |                                                                               |

### `POST /api/reset-password`

| Case        | Category | Body                                                                      | Expected | Notes                                                                                                      |
| ----------- | -------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Success     | Positive | `email`, the `resetToken` just returned by forgot-password, `newPassword` | 200      | Chain this after the forgot-password case in a scenario, or copy the token manually for a standalone case. |
| Wrong token | Negative | Same email, `resetToken: "0000"`                                          | 400      |                                                                                                            |

---

## Users

### `GET /api/users/me`

| Case    | Category | Auth              | Expected | Notes                                                                                                                                                                           |
| ------- | -------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success | Positive | `{{bearerToken}}` | 200      | Add an assertion that the response body **does** contain a `password` field — this documents SEC-01 (plaintext password returned) rather than hiding it. See `EShop_Defect.md`. |
| No auth | Security | No Auth override  | 401      |                                                                                                                                                                                 |

### `PUT /api/users/me`

| Case                     | Category               | Body                                                                                                               | Auth              | Expected         | Notes                                                                                                                                                                                  |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                  | Positive               | `{ "name": "Tester One Updated", "shipping_address": "123 Test Street, District 1, HCMC", "phone": "0912345678" }` | `{{bearerToken}}` | 200              |                                                                                                                                                                                        |
| Malformed phone accepted | Boundary (defect demo) | Same, `phone: "12345"`                                                                                             | `{{bearerToken}}` | 200 **(verify)** | No phone-format validation confirmed in source; if this instead returns 400, the format _is_ validated and this case should move to a genuine Boundary check instead of a defect demo. |
| Role injection           | Security (defect demo) | `{ "role": "admin" }`                                                                                              | `{{bearerToken}}` | 200              | This is SEC-06 — the mechanism `EShop_Apidog_Setup.md` uses to bootstrap the admin test account. Re-login afterward to get a token reflecting the new role. See `EShop_Defect.md`.     |

---

## Products

### `GET /api/products`

| Case                  | Category               | Query                    | Expected       | Notes                                                                                                                                                     |
| --------------------- | ---------------------- | ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success               | Positive               | _(none)_                 | 200            | Array of products.                                                                                                                                        |
| Empty result          | Boundary               | `search=zzz_nonexistent` | 200            | Empty array.                                                                                                                                              |
| SQL injection payload | Security (defect demo) | `search=' OR '1'='1`     | 500, HTML body | SEC-05 — response is HTML, not JSON, on SQL failure; assert `Content-Type` is _not_ `application/json` for this case specifically. See `EShop_Defect.md`. |

### `GET /api/products/{id}`

| Case                 | Category               | Path        | Expected                     | Notes                              |
| -------------------- | ---------------------- | ----------- | ---------------------------- | ---------------------------------- |
| Success (odd id)     | Positive               | `id=1`      | 200, `price` is a number     |                                    |
| Type quirk (even id) | Boundary (defect demo) | `id=2`      | 200, `price` is a **string** | See `EShop_Defect.md`.             |
| Not found            | Negative (defect demo) | `id=999999` | 200, body `{}`               | Not `404` — see `EShop_Defect.md`. |

### `POST /api/products`

| Case                   | Category               | Body                                                            | Auth              | Expected         | Notes                                                                           |
| ---------------------- | ---------------------- | --------------------------------------------------------------- | ----------------- | ---------------- | ------------------------------------------------------------------------------- |
| Success                | Positive               | `{ "name": "Test Product", "price": 100000, "category_id": 1 }` | `{{bearerToken}}` | 200              |                                                                                 |
| No auth still succeeds | Security (defect demo) | Same                                                            | No Auth override  | 200              | Spec says admin-only; SUT enforces nothing. See `EShop_Defect.md`.              |
| Zero price accepted    | Boundary (defect demo) | `price: 0`, rest valid                                          | `{{bearerToken}}` | 200 **(verify)** | No price validation confirmed; if 400, re-classify as a genuine boundary check. |

### `PUT /api/products/{id}`

| Case                    | Category               | Body                                                                    | Auth              | Expected         | Notes                  |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------- | ----------------- | ---------------- | ---------------------- |
| Success                 | Positive               | `{ "name": "Test Product Updated", "price": 120000, "category_id": 1 }` | `{{bearerToken}}` | 200              |                        |
| No auth still succeeds  | Security (defect demo) | Same                                                                    | No Auth override  | 200              | See `EShop_Defect.md`. |
| Negative price accepted | Boundary (defect demo) | `price: -1`, rest valid                                                 | `{{bearerToken}}` | 200 **(verify)** |                        |

### `DELETE /api/products/{id}`

| Case                     | Category               | Path              | Auth              | Expected                 | Notes                                                                    |
| ------------------------ | ---------------------- | ----------------- | ----------------- | ------------------------ | ------------------------------------------------------------------------ |
| Success                  | Positive               | valid existing id | `{{bearerToken}}` | 200                      |                                                                          |
| No auth still succeeds   | Security (defect demo) | Same id           | No Auth override  | 200                      | See `EShop_Defect.md`.                                                   |
| Nonexistent id still 200 | Negative (defect demo) | `id=999999`       | `{{bearerToken}}` | 200, `"Product deleted"` | Nothing was actually deleted; no row-count check. See `EShop_Defect.md`. |

### `POST /api/admin/import-products`

| Case                         | Category               | Body                                                               | Auth                             | Expected            | Notes                                                                                                                    |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------ | -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| All valid                    | Positive               | Two valid products (see `EShop_OpenApi.yaml`'s `allValid` example) | `{{adminToken}}`                 | 200                 | Reported `inserted` count may be wrong — the response is built before async row callbacks finish. See `EShop_Defect.md`. |
| Partial invalid, no rollback | Negative (defect demo) | One row missing `name` (see the `partiallyInvalid` example)        | `{{adminToken}}`                 | 200, partial insert | FR-16 requires all-or-nothing; the SUT commits the valid rows anyway. See `EShop_Defect.md`.                             |
| No admin-role check          | Security (defect demo) | Same as "All valid"                                                | `{{bearerToken}}` (regular user) | 200                 | See `EShop_Defect.md`.                                                                                                   |

---

## Categories

### `GET /api/categories`

| Case    | Category | Expected   | Notes |
| ------- | -------- | ---------- | ----- |
| Success | Positive | 200, array |       |

### `POST /api/categories`

| Case                | Category               | Body                          | Auth              | Expected         | Notes                                                                           |
| ------------------- | ---------------------- | ----------------------------- | ----------------- | ---------------- | ------------------------------------------------------------------------------- |
| Success             | Positive               | `{ "name": "Test Category" }` | `{{bearerToken}}` | 200              |                                                                                 |
| Empty name accepted | Boundary (defect demo) | `{ "name": "" }`              | `{{bearerToken}}` | 200 **(verify)** |                                                                                 |
| No auth             | Security               | Same as success               | No Auth override  | 401              | Unlike Products, Categories does enforce a valid token (just not a role check). |

### `PUT /api/categories/{id}`

| Case           | Category | Body                                  | Auth              | Expected     | Notes                                                            |
| -------------- | -------- | ------------------------------------- | ----------------- | ------------ | ---------------------------------------------------------------- |
| Success        | Positive | `{ "name": "Test Category Renamed" }` | `{{bearerToken}}` | 200          |                                                                  |
| No auth        | Security | Same                                  | No Auth override  | 401          |                                                                  |
| Nonexistent id | Negative | `id=999999`                           | `{{bearerToken}}` | **(verify)** | Not confirmed against source — run and record the actual result. |

### `DELETE /api/categories/{id}`

| Case           | Category | Auth                           | Expected     | Notes |
| -------------- | -------- | ------------------------------ | ------------ | ----- |
| Success        | Positive | `{{bearerToken}}`              | 200          |       |
| No auth        | Security | No Auth override               | 401          |       |
| Nonexistent id | Negative | `{{bearerToken}}`, `id=999999` | **(verify)** |       |

---

## Cart

### `GET /api/cart`

| Case    | Category | Auth              | Expected | Notes                |
| ------- | -------- | ----------------- | -------- | -------------------- |
| Success | Positive | `{{bearerToken}}` | 200      | Array, may be empty. |
| No auth | Security | No Auth override  | 401      |                      |

### `POST /api/cart`

Fully worked in `EShop_Apidog_Steps.md`, Step 6 — repeated here for a complete
per-endpoint reference.

| Case                         | Category | Body                                                                    | Auth              | Expected     | Notes                                                                                                                                                                                  |
| ---------------------------- | -------- | ----------------------------------------------------------------------- | ----------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                      | Positive | `{ "id": 1, "name": "Sample Product", "price": 100000, "quantity": 1 }` | `{{bearerToken}}` | 200          |                                                                                                                                                                                        |
| Missing Authorization header | Security | Same body                                                               | No Auth override  | 401          |                                                                                                                                                                                        |
| Quantity = 0                 | Boundary | Same, `quantity: 0`                                                     | `{{bearerToken}}` | 400          |                                                                                                                                                                                        |
| Nonexistent product id       | Negative | Same, `id: 999999`                                                      | `{{bearerToken}}` | **(verify)** | Cart pushes `req.body` verbatim with no existence check — likely 200 with a nonsense cart entry rather than a proper error. If so, this is a defect worth adding to `EShop_Defect.md`. |

---

## Orders

### `POST /api/checkout`

| Case                             | Category               | Body                                                                                  | Auth              | Expected                                  | Notes                                                                                                |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Success                          | Positive               | `{ "total_amount": 100000, "shipping_address": "123 Test Street, District 1, HCMC" }` | `{{bearerToken}}` | 200, `orderId` returned                   |                                                                                                      |
| No auth                          | Security               | Same                                                                                  | No Auth override  | 401                                       |                                                                                                      |
| Client-controlled total accepted | Negative (defect demo) | `total_amount: 1`, rest valid                                                         | `{{bearerToken}}` | 200, order stored with `total_amount = 1` | FR-08 — backend trusts the client value instead of recomputing from the cart. See `EShop_Defect.md`. |

### `GET /api/orders/my-orders`

| Case    | Category | Auth              | Expected | Notes |
| ------- | -------- | ----------------- | -------- | ----- |
| Success | Positive | `{{bearerToken}}` | 200      |       |
| No auth | Security | No Auth override  | 401      |       |

### `PUT /api/orders/{id}/cancel`

| Case                             | Category               | Path/State                                    | Auth              | Expected | Notes                                                                                            |
| -------------------------------- | ---------------------- | --------------------------------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------ |
| Success (pending)                | Positive               | A fresh `pending` order                       | `{{bearerToken}}` | 200      |                                                                                                  |
| Cancel a shipping order accepted | Negative (defect demo) | An order in `shipping` status                 | `{{bearerToken}}` | 200      | Should be 400 — FR-10 only allows user-cancel from `pending`/`confirmed`. See `EShop_Defect.md`. |
| Already canceled/delivered       | Negative               | An order already in `canceled` or `delivered` | `{{bearerToken}}` | 400      | This guard _does_ work correctly.                                                                |
| No auth                          | Security               | Any order id                                  | No Auth override  | 401      |                                                                                                  |
| Not found                        | Negative               | `id=999999`                                   | `{{bearerToken}}` | 404      |                                                                                                  |

### `GET /api/orders/{id}`

| Case          | Category               | Path                  | Auth              | Expected | Notes                                                                                       |
| ------------- | ---------------------- | --------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------- |
| Success       | Positive               | Your own order id     | `{{bearerToken}}` | 200      |                                                                                             |
| No-auth-check | Security (defect demo) | Any existing order id | No Auth override  | 200      | Should require ownership/auth per FR-11 — anyone can read any order. See `EShop_Defect.md`. |
| Not found     | Negative               | `id=999999`           | _(none needed)_   | 404      |                                                                                             |

---

## Coupons

### `GET /api/coupons`

| Case    | Category | Auth                             | Expected | Notes                                                                                                                       |
| ------- | -------- | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Success | Positive | `{{bearerToken}}` (regular user) | 200      | Spec says admin-only; SUT only checks token validity, not role — regular users can list all coupons. See `EShop_Defect.md`. |
| No auth | Security | No Auth override                 | 401      | Still requires _some_ valid token, just not an admin one.                                                                   |

### `POST /api/apply-coupon`

| Case                              | Category               | Body                                                                | Expected                     | Notes                                                                                                                     |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Success                           | Positive               | `{ "code": "SAVE10", "total_amount": 500000, "user_id": 1 }`        | 200                          | Record the actual `final_amount` — the percent formula is inverted, so the number will look wrong. See `EShop_Defect.md`. |
| Missing code                      | Negative               | `code: ""`, rest valid                                              | 400                          |                                                                                                                           |
| Below minimum (off-by-one)        | Boundary (defect demo) | `total_amount` set exactly equal to the coupon's `min_order_amount` | 400, "below minimum"         | Should be accepted — SUT uses `>` instead of `>=`. See `EShop_Defect.md`.                                                 |
| `user_id` omitted, limit bypassed | Security (defect demo) | `{ "code": "SAVE10", "total_amount": 500000 }`                      | 200, unlimited reuse allowed | See `EShop_Defect.md`.                                                                                                    |

### `POST /api/coupon-usage`

| Case                      | Category               | Body                                             | Auth              | Expected                   | Notes                  |
| ------------------------- | ---------------------- | ------------------------------------------------ | ----------------- | -------------------------- | ---------------------- |
| Success                   | Positive               | `{ "coupon_id": 1 }`                             | `{{bearerToken}}` | 200                        |                        |
| No auth                   | Security               | Same                                             | No Auth override  | 401                        |                        |
| No real-order cross-check | Negative (defect demo) | Arbitrary `coupon_id` with no checkout behind it | `{{bearerToken}}` | 200, usage recorded anyway | See `EShop_Defect.md`. |

### `POST /api/admin/coupons`

| Case                | Category               | Body                                                                                                                                            | Auth                             | Expected | Notes                              |
| ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- | ---------------------------------- |
| Success             | Positive               | `{ "code": "SAVE10", "type": "percent", "discount_value": 10, "min_order_amount": 200000, "expired_at": "2027-01-31", "max_uses_per_user": 1 }` | `{{adminToken}}`                 | 200      |                                    |
| No admin-role check | Security (defect demo) | Same, different `code`                                                                                                                          | `{{bearerToken}}` (regular user) | 200      | See `EShop_Defect.md`.             |
| Duplicate code      | Negative               | Reuse an existing `code`                                                                                                                        | `{{adminToken}}`                 | 500      | DB error on the unique constraint. |

### `DELETE /api/admin/coupons/{id}`

| Case                | Category               | Auth                             | Expected     | Notes                  |
| ------------------- | ---------------------- | -------------------------------- | ------------ | ---------------------- |
| Success             | Positive               | `{{adminToken}}`                 | 200          |                        |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | 200          | See `EShop_Defect.md`. |
| Not found           | Negative               | `{{adminToken}}`, `id=999999`    | **(verify)** |                        |

---

## Admin

### `GET /api/admin/users`

| Case                | Category               | Auth                             | Expected                     | Notes                                                                                                               |
| ------------------- | ---------------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Success             | Positive               | `{{adminToken}}`                 | 200, `password` field absent | Contrast with `GET /api/users/me`, which _does_ leak `password` — worth noting the inconsistency in the User Guide. |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | 200                          | See `EShop_Defect.md`.                                                                                              |
| No auth             | Security               | No Auth override                 | 401                          |                                                                                                                     |

### `DELETE /api/admin/users/{id}`

| Case                     | Category               | Path                             | Auth                             | Expected | Notes                                                                                                                                                                                     |
| ------------------------ | ---------------------- | -------------------------------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                  | Positive               | A disposable throwaway user's id | `{{adminToken}}`                 | 200      | Use a throwaway account created just for this case — not `tester.1` or your main admin account.                                                                                           |
| Self-delete allowed      | Security (defect demo) | The **admin account's own id**   | `{{adminToken}}`                 | 200      | Should be blocked per FR-19. **Caution:** running this against your real admin account deletes it — use a second, disposable admin account for this specific case. See `EShop_Defect.md`. |
| No admin-role check      | Security (defect demo) | Any other user's id              | `{{bearerToken}}` (regular user) | 200      | See `EShop_Defect.md`.                                                                                                                                                                    |
| Nonexistent id still 200 | Negative (defect demo) | `id=999999`                      | `{{adminToken}}`                 | 200      | See `EShop_Defect.md`.                                                                                                                                                                    |

### `GET /api/admin/orders`

| Case                | Category               | Auth                             | Expected                  | Notes                  |
| ------------------- | ---------------------- | -------------------------------- | ------------------------- | ---------------------- |
| Success             | Positive               | `{{adminToken}}`                 | 200, includes `user_name` |                        |
| No admin-role check | Security (defect demo) | `{{bearerToken}}` (regular user) | 200                       | See `EShop_Defect.md`. |

### `PUT /api/admin/orders/{id}/status`

Named examples already exist in `EShop_OpenApi.yaml` (`validTransition`,
`illegalTransition`, `bugTransition`) — reuse those bodies directly.

| Case                                    | Category               | Body                        | State of target order | Auth                             | Expected | Notes                                                                             |
| --------------------------------------- | ---------------------- | --------------------------- | --------------------- | -------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Valid transition                        | Positive               | `{ "status": "confirmed" }` | `pending`             | `{{adminToken}}`                 | 200      |                                                                                   |
| Illegal transition (correctly rejected) | Negative               | `{ "status": "delivered" }` | `pending`             | `{{adminToken}}`                 | 400      | This guard works correctly.                                                       |
| Bug: canceled → delivered accepted      | Negative (defect demo) | `{ "status": "delivered" }` | `canceled`            | `{{adminToken}}`                 | 200      | Should be rejected — both are meant to be terminal states. See `EShop_Defect.md`. |
| No admin-role check                     | Security (defect demo) | `{ "status": "confirmed" }` | `pending`             | `{{bearerToken}}` (regular user) | 200      | See `EShop_Defect.md`.                                                            |
