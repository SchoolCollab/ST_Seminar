# EShop — Domain Testing (S04), All Endpoints

## Overview

Applies S04's four-step method (identify variables → identify equivalence
classes → select test cases → boundary-value analysis) across every EShop
endpoint, not just `POST /api/reset-password`'s original worked example (still
below, in full, as the reference for the method itself).

**Grouped by structural pattern**, not endpoint-by-endpoint prose, because most
of the domain-testing reasoning repeats across similarly-shaped endpoints — a
"delete by path id" endpoint's variable is always just `id`, with the same class
shape every time. Deriving that from scratch nine times would be nine times the
words for zero extra insight. Endpoints with genuinely distinct multi-field
bodies get the full per-field breakdown; endpoints that share a pattern get the
pattern derived once and then applied per-endpoint in a compact table.

**Assertion principle, unchanged from `Material/Document/Apidog/EShop_Apidog_TestCases.md`:** every
invalid case asserts the _specification-correct_ rejection, never a prediction
of a known bug. Cases expected to currently fail because of a confirmed or
suspected defect are marked **[EXPECTED TO FAIL]**. Genuinely unknown outcomes
are marked **(verify)** with no hard-coded assertion of which way it resolves.

**What's out of scope here, and why.** Eight endpoints take no input at all
beyond auth (`GET /api/users/me`, `GET /api/products`'s base call,
`GET /api/categories`, `GET /api/cart`, `GET /api/orders/my-orders`,
`GET /api/coupons`, `GET /api/admin/users`, `GET /api/admin/orders`) — there's
no request body or parameter to partition into equivalence classes, so S04
doesn't apply to them structurally. Their coverage lives in
`Material/Document/Apidog/EShop_Apidog_TestCases.md` (auth/role Security cases) instead, which is the
right tool for "does this endpoint enforce access control," a different question
than "does this endpoint handle bad input correctly."

---

## Pattern A — path `{id}` only, no request body

Covers: `GET /api/products/{id}`, `DELETE /api/products/{id}`,
`DELETE /api/categories/{id}`, `PUT /api/orders/{id}/cancel`,
`GET /api/orders/{id}`, `DELETE /api/admin/coupons/{id}`,
`DELETE /api/admin/users/{id}`. (`PUT /api/products/{id}`,
`PUT /api/categories/{id}`, and `PUT /api/admin/orders/{id}/status` also have a
path id, but their _body_ is the more interesting domain-testing target —
covered in their own sections below; this pattern is only for endpoints where
`id` is the sole input.)

### Step 1 — variable

One variable per endpoint: `id`, a path parameter, declared `integer` in the
spec but never validated as such anywhere confirmed in source.

### Step 2 — equivalence classes

| Class   | Description                                                        | Valid?                  |
| ------- | ------------------------------------------------------------------ | ----------------------- |
| EC-id-1 | An existing row's real id                                          | Valid                   |
| EC-id-2 | A well-formed integer that doesn't exist as a row (`999999`)       | Invalid — not found     |
| EC-id-3 | Not an integer at all (`"abc"`, a path segment that isn't numeric) | Invalid — type          |
| EC-id-4 | Zero                                                               | Invalid — boundary      |
| EC-id-5 | Negative                                                           | Invalid — invalid class |

### Step 3 — test cases

EC-id-1 is each endpoint's existing Success case — already in
`Material/Document/Apidog/EShop_Apidog_TestCases.md`, not repeated here. EC-id-2 (nonexistent id) is also
already present for most of these. **EC-id-3 (non-numeric id) has never been
tested on any of these seven endpoints — this is the real gap this pattern
closes.**

| Endpoint                         | New case                                     | Expected     | Notes                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/products/{id}`         | Non-numeric id in path (`/api/products/abc`) | 400 (verify) | Express route param — untyped by default; likely reaches the DB query as a string and either 400s cleanly or 500s on a query error. Worth checking whether this becomes a second SQL-adjacent crash like the search-param SEC-05 case. |
| `DELETE /api/products/{id}`      | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |
| `DELETE /api/categories/{id}`    | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |
| `PUT /api/orders/{id}/cancel`    | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |
| `GET /api/orders/{id}`           | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |
| `DELETE /api/admin/coupons/{id}` | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |
| `DELETE /api/admin/users/{id}`   | Same                                         | 400 (verify) |                                                                                                                                                                                                                                        |

EC-id-4/5 (zero, negative) are lower priority — a numeric-but-out-of-range id
most likely just falls into the same "not found" bucket as EC-id-2 rather than
revealing new behavior, since SQLite doesn't distinguish "id doesn't exist" from
"id is negative" at the query level. Worth one spot-check on a single endpoint
(e.g. `GET /api/products/-1`) rather than all seven — if it behaves identically
to the nonexistent-id case, the rest can be assumed to match without
individually testing.

### Step 4 — BVA

No genuine ordered boundary exists here — "id" isn't a range with a spec-defined
minimum/maximum, it's an arbitrary database key. EC-id-4 (zero) is the closest
thing to a boundary point (the edge between "positive id space" and "everything
else"), already captured above.

---

## Pattern B — single required string field

Covers: `POST /api/categories` (`name`), `PUT /api/categories/{id}` (`name`),
`POST /api/forgot-password` (`email`) — forgot-password already has its
email-existence case in `Material/Document/Apidog/EShop_Apidog_TestCases.md`; this section adds the
classes that were missing.

### `POST /api/categories` and `PUT /api/categories/{id}` — `name`

| Class        | Description                                | Valid?                                                                                |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| EC-catname-1 | A reasonable non-empty string              | Valid                                                                                 |
| EC-catname-2 | Not a string (number, boolean, null)       | Invalid — type                                                                        |
| EC-catname-3 | Empty string                               | Invalid — boundary (already in `Material/Document/Apidog/EShop_Apidog_TestCases.md` for POST; missing for PUT) |
| EC-catname-4 | Missing from the body entirely             | Invalid — required-field                                                              |
| EC-catname-5 | Extremely long string (10,000+ characters) | Invalid — boundary (upper)                                                            |

No `maxLength` is declared on `Category.name` in the spec (unlike
`Product.name`, which has `maxLength: 255`) — EC-catname-5 is genuinely
open-ended here, which is itself worth a note: if an unbounded string is
accepted and stored, that's a real finding (no length limit on a field that will
presumably render in a UI somewhere).

| #   | Case                                     | Body                          | Expected                                                               | Notes                                                                                                          |
| --- | ---------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string name rejected                 | `{ "name": 12345 }`           | 400 (verify)                                                           | New — not in TestCases.md                                                                                      |
| 2   | Missing name field rejected              | `{}`                          | 400 (verify)                                                           | New                                                                                                            |
| 3   | Extremely long name accepted or rejected | `{ "name": "<10000 chars>" }` | 400 (verify) — or if accepted, log the absent length limit as a defect | New; no declared bound exists to test against, so this case's purpose is discovering whether one exists at all |

### `POST /api/forgot-password` — `email`

Already has EC-email-4 (unregistered) covered. Missing: type and format classes,
matching the same breakdown already done for `reset-password`'s `email` field
(same underlying validation code almost certainly, so the same gaps likely
exist).

| #   | Case                         | Body                          | Expected     | Notes                                       |
| --- | ---------------------------- | ----------------------------- | ------------ | ------------------------------------------- |
| 1   | Non-string email rejected    | `{ "email": 12345 }`          | 400 (verify) | New                                         |
| 2   | Malformed email rejected     | `{ "email": "not-an-email" }` | 400 (verify) | New — mirrors `reset-password`'s EC-email-3 |
| 3   | Missing email field rejected | `{}`                          | 400 (verify) | New                                         |

---

## `POST /api/register` — `name`, `email`, `password`

`Material/Document/Apidog/EShop_Apidog_TestCases.md` already has the malformed-email and duplicate-email
cases (both `[EXPECTED TO FAIL]`, tracking the confirmed no-validation defect).
Missing: type classes on all three fields, and any coverage of `password` at
all.

### Step 1 & 2 — variables and classes

| Variable   | Class                                      | Description       | Valid?                   |
| ---------- | ------------------------------------------ | ----------------- | ------------------------ |
| `name`     | EC-name-1                                  | Non-empty string  | Valid                    |
|            | EC-name-2                                  | Not a string      | Invalid — type           |
|            | EC-name-3                                  | Missing           | Invalid — required-field |
| `email`    | _(already covered — malformed, duplicate)_ |                   |                          |
|            | EC-regemail-3                              | Not a string      | Invalid — type           |
|            | EC-regemail-4                              | Missing           | Invalid — required-field |
| `password` | EC-pw-1                                    | Reasonable string | Valid                    |
|            | EC-pw-2                                    | Not a string      | Invalid — type           |
|            | EC-pw-3                                    | Empty string      | Invalid — boundary       |
|            | EC-pw-4                                    | Missing           | Invalid — required-field |

### Step 3 — new cases

| #   | Case                      | Body                                                                          | Expected     | Notes                                                                                                                                                                                        |
| --- | ------------------------- | ----------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string name rejected  | `{ "name": 12345, "email": "new@example.com", "password": "TesterPass123!" }` | 400 (verify) |                                                                                                                                                                                              |
| 2   | Missing name rejected     | Omit `name`                                                                   | 400 (verify) |                                                                                                                                                                                              |
| 3   | Non-string email rejected | `email: 12345`                                                                | 400 (verify) |                                                                                                                                                                                              |
| 4   | Missing email rejected    | Omit `email`                                                                  | 400 (verify) |                                                                                                                                                                                              |
| 5   | Empty password rejected   | `password: ""`                                                                | 400 (verify) | Given no format validation is confirmed anywhere on this endpoint, a 200 here is very plausible and would be the same "no validation" defect already tracked, not a new independent finding. |
| 6   | Missing password rejected | Omit `password`                                                               | 400 (verify) |                                                                                                                                                                                              |

### Step 4 — BVA

No declared length bound on any of the three fields — same absent-boundary
situation as `Category.name`. Not testable against a real boundary until one is
either found in source or confirmed absent.

---

## `POST /api/login` — `email`, `password`

Already has the wrong-password and unknown-email cases (both correctly asserting
`401`, no defect). Missing: type classes.

| #   | Case                      | Body                                  | Expected            | Notes                                                                                                                           |
| --- | ------------------------- | ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string email rejected | `{ "email": 12345, "password": "x" }` | 400 or 401 (verify) | Genuinely unclear which error branch a type mismatch would hit before reaching the "wrong credentials" logic — worth observing. |
| 2   | Missing email rejected    | Omit `email`                          | 400 (verify)        |                                                                                                                                 |
| 3   | Missing password rejected | Omit `password`                       | 400 (verify)        |                                                                                                                                 |

No BVA — `email`/`password` aren't ordered-range fields.

---

## `PUT /api/users/me` — `name`, `shipping_address`, `phone` (`role` handled separately, see `Material/Document/Apidog/EShop_Apidog_TestCases.md`)

Only `phone` currently has an invalid-class case. `name` and `shipping_address`
have zero negative coverage — this is one of the biggest real gaps in the whole
project, since this endpoint is hit on every profile update and the spec
declares no fields as required at all (`UpdateProfileRequest` has no `required`
array).

### Step 1 & 2

| Variable           | Class                                                              | Description       | Valid?         |
| ------------------ | ------------------------------------------------------------------ | ----------------- | -------------- |
| `name`             | EC-pname-1                                                         | Reasonable string | Valid          |
|                    | EC-pname-2                                                         | Not a string      | Invalid — type |
| `shipping_address` | EC-addr-1                                                          | Reasonable string | Valid          |
|                    | EC-addr-2                                                          | Not a string      | Invalid — type |
| `phone`            | _(already covered — malformed shape, `Material/Document/Apidog/EShop_Apidog_TestCases.md`)_ |                   |                |
|                    | EC-phone-2                                                         | Not a string      | Invalid — type |

Since nothing is `required` in this schema, there's no "missing field" invalid
class here — omitting a field is presumably valid (a partial update), which is
itself worth one confirming case rather than assuming.

### Step 3 — new cases

| #   | Case                                        | Body                                          | Expected     | Notes                                                                                                                              |
| --- | ------------------------------------------- | --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string name rejected                    | `{ "name": 12345 }`                           | 400 (verify) |                                                                                                                                    |
| 2   | Non-string shipping_address rejected        | `{ "shipping_address": 12345 }`               | 400 (verify) |                                                                                                                                    |
| 3   | Non-string phone rejected                   | `{ "phone": 912345678 }` (number, not string) | 400 (verify) |                                                                                                                                    |
| 4   | Partial update with only one field succeeds | `{ "name": "Solo Field Update" }`             | 200 (verify) | Confirms omitted fields don't get nulled out — a real correctness property worth having a case for, not just an edge case to skip. |

No BVA — no declared length bounds on any of these three fields either.

---

## `POST /api/products` and `PUT /api/products/{id}` — `name`, `price`, `description`, `imageUrl`, `category_id`

The richest schema in the API — `name` has a real declared `maxLength: 255`, and
`price` has a real declared `minimum: 1`. This is the one endpoint pair where
BVA has genuine spec-declared boundaries to test against, not just hypothesized
ones. `Material/Document/Apidog/EShop_Apidog_TestCases.md` already covers `price` boundary (zero,
negative) on both — this section fills in `name`, `category_id`, and the
declared `maxLength`.

### Step 1 & 2

| Variable      | Class                             | Description                                         | Valid?                                                  |
| ------------- | --------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `name`        | EC-pname-1                        | Non-empty string, ≤255 chars                        | Valid                                                   |
|               | EC-pname-2                        | Not a string                                        | Invalid — type                                          |
|               | EC-pname-3                        | Missing                                             | Invalid — required-field                                |
|               | EC-pname-4                        | Exactly 255 chars                                   | Valid — boundary (UB)                                   |
|               | EC-pname-5                        | 256 chars                                           | Invalid — boundary (UB+1), per the declared `maxLength` |
| `price`       | _(zero/negative already covered)_ |                                                     |                                                         |
|               | EC-price-3                        | Not a number                                        | Invalid — type                                          |
|               | EC-price-4                        | Missing                                             | Invalid — required-field                                |
| `category_id` | EC-catid-1                        | An existing category's id                           | Valid                                                   |
|               | EC-catid-2                        | Not an integer                                      | Invalid — type                                          |
|               | EC-catid-3                        | An integer that doesn't reference any real category | Invalid — referential integrity                         |
|               | EC-catid-4                        | Missing                                             | Invalid — required-field                                |

### Step 3 — new cases (apply to both POST and PUT)

| #   | Case                               | Body (delta from baseline) | Expected     | Notes                                                                                                                                                                                        |
| --- | ---------------------------------- | -------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string name rejected           | `name: 12345`              | 400 (verify) |                                                                                                                                                                                              |
| 2   | Missing name rejected              | Omit `name`                | 400 (verify) |                                                                                                                                                                                              |
| 3   | Name at exactly 255 chars accepted | `name` = 255-char string   | 200          | This is the one BVA case in the whole document backed by a real spec-declared bound — genuinely worth getting right.                                                                         |
| 4   | Name at 256 chars rejected         | `name` = 256-char string   | 400 (verify) | The paired boundary case — if this returns 200, the declared `maxLength: 255` isn't actually enforced, which is a real, spec-vs-implementation defect distinct from anything already logged. |
| 5   | Non-numeric price rejected         | `price: "abc"`             | 400 (verify) |                                                                                                                                                                                              |
| 6   | Missing price rejected             | Omit `price`               | 400 (verify) |                                                                                                                                                                                              |
| 7   | Non-integer category_id rejected   | `category_id: "abc"`       | 400 (verify) |                                                                                                                                                                                              |
| 8   | Nonexistent category_id rejected   | `category_id: 999999`      | 400 (verify) | Referential integrity — does the SUT check the category actually exists, or silently accept an orphaned reference?                                                                           |
| 9   | Missing category_id rejected       | Omit `category_id`         | 400 (verify) |                                                                                                                                                                                              |

### Step 4 — BVA

`name`'s 255-char boundary (cases 3–4 above) is the cleanest BVA in this whole
document — a real declared bound, not a hypothesis. `price`'s boundary (0, 1,
-1) is already in `Material/Document/Apidog/EShop_Apidog_TestCases.md`; note that the declared
`minimum: 1` means `price: 0` is the correct LB−1 case and `price: 1` should be
the true lower boundary success case, not `price: 100000` as the only "valid"
example — worth adding a `price: 1` case specifically to test the exact
boundary, not just a comfortably-valid value.

---

## `POST /api/admin/import-products` — `products: []`

Domain testing here operates one level up from the individual `ProductInput`
fields (already covered above) — the array itself has its own classes.

| Class    | Description                        | Valid?                                                                        |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| EC-arr-1 | 1+ valid products                  | Valid                                                                         |
| EC-arr-2 | Empty array                        | Invalid — boundary (declared `minItems: 1`)                                   |
| EC-arr-3 | Not an array (an object, a string) | Invalid — type                                                                |
| EC-arr-4 | Missing entirely                   | Invalid — required-field                                                      |
| EC-arr-5 | Array where every item is invalid  | Invalid — content, distinct from the already-tested "some items invalid" case |

| #   | Case                            | Body                             | Expected     | Notes                                                                                                                                                    |
| --- | ------------------------------- | -------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Empty array rejected            | `{ "products": [] }`             | 400          | This is the one case here backed by a real declared bound (`minItems: 1`) — should already be correctly enforced, worth confirming rather than assuming. |
| 2   | Non-array products rejected     | `{ "products": "not an array" }` | 400 (verify) |                                                                                                                                                          |
| 3   | Missing products field rejected | `{}`                             | 400          | Already implied by `EShop_OpenApi.yaml`'s documented 400 response ("`products` is missing, not an array, or empty") — should be correct.                 |

---

## `POST /api/cart` — `id`, `name`, `price`, `quantity`

`quantity` boundary (0, 1) is already covered. `id`, `name`, `price` have never
been given an invalid class at all, despite `Material/Document/SUT-Reference/EShop_Defect.md` documenting that
this endpoint performs zero schema validation — meaning every one of these is a
strong defect-tracking candidate, not a routine gap-fill.

| #   | Case                       | Body (delta)         | Expected | Notes                                                                                                                                     |
| --- | -------------------------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-numeric id rejected    | `id: "abc"`          | 400      | **[EXPECTED TO FAIL]** — no validation exists; this almost certainly gets pushed verbatim.                                                |
| 2   | Missing id field rejected  | Omit `id`            | 400      | **[EXPECTED TO FAIL]**                                                                                                                    |
| 3   | Non-string name rejected   | `name: 12345`        | 400      | **[EXPECTED TO FAIL]**                                                                                                                    |
| 4   | Non-numeric price rejected | `price: "expensive"` | 400      | **[EXPECTED TO FAIL]**                                                                                                                    |
| 5   | Negative price rejected    | `price: -100000`     | 400      | **[EXPECTED TO FAIL]** — the endpoint trusts whatever price the client sends; there's no server-side price lookup at all for cart pushes. |

These five cases are collectively the strongest evidence yet for the "no schema
validation on `POST /api/cart`" defect already flagged as a hypothesis in
`Material/Document/Apidog/EShop_Apidog_TestCases.md` — if even two or three of these come back 200, that
single write-up is well-evidenced rather than resting on one uncertain case.

---

## `POST /api/checkout` — `total_amount`, `shipping_address`

The client-controlled-total case (asserting the server should recompute, not
trust the client value) already exists as a
`[STATUS CODE ALONE IS INSUFFICIENT]` case. This section adds the type/missing
classes.

| #   | Case                              | Body (delta)                | Expected     | Notes                                                                                                                                                    |
| --- | --------------------------------- | --------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-numeric total_amount rejected | `total_amount: "expensive"` | 400 (verify) |                                                                                                                                                          |
| 2   | Missing total_amount rejected     | Omit `total_amount`         | 400 (verify) |                                                                                                                                                          |
| 3   | Missing shipping_address rejected | Omit `shipping_address`     | 400 (verify) |                                                                                                                                                          |
| 4   | Negative total_amount rejected    | `total_amount: -100000`     | 400 (verify) | Distinct from the client-controlled-total defect case — this tests whether _any_ sanity bound exists, not whether the server trusts the client's number. |

---

## `POST /api/apply-coupon` — `code`, `total_amount`, `user_id`

`code` empty-string and the boundary/`user_id`-omission cases already exist.
Missing: type classes and the `total_amount` domain more broadly.

| #   | Case                              | Body (delta)                                      | Expected     | Notes                                                                                                                                                                                                                     |
| --- | --------------------------------- | ------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-string code rejected          | `code: 12345`                                     | 400 (verify) |                                                                                                                                                                                                                           |
| 2   | Missing code field rejected       | Omit `code` entirely (distinct from empty string) | 400 (verify) |                                                                                                                                                                                                                           |
| 3   | Non-numeric total_amount rejected | `total_amount: "a lot"`                           | 400 (verify) |                                                                                                                                                                                                                           |
| 4   | Zero total_amount                 | `total_amount: 0`                                 | 400 (verify) | Below any coupon's minimum by definition — should be rejected the same way the boundary case is, worth confirming it isn't treated as a special case (e.g., a coupon with `min_order_amount: 0` might wrongly accept it). |
| 5   | Missing total_amount rejected     | Omit `total_amount`                               | 400 (verify) |                                                                                                                                                                                                                           |

---

## `POST /api/coupon-usage` — `coupon_id`

Already has the no-real-order-cross-check case (`[EXPECTED TO FAIL]`). Missing:
type/missing classes.

| #   | Case                           | Body                     | Expected     | Notes |
| --- | ------------------------------ | ------------------------ | ------------ | ----- |
| 1   | Non-numeric coupon_id rejected | `{ "coupon_id": "abc" }` | 400 (verify) |       |
| 2   | Missing coupon_id rejected     | `{}`                     | 400 (verify) |       |

---

## `POST /api/admin/coupons` — `code`, `type`, `discount_value`, `min_order_amount`, `expired_at`, `max_uses_per_user`

Six fields, and until now only `code` (duplicate) had any negative coverage at
all. `discount_value` has a declared `minimum: 1`, `min_order_amount` has a
declared `minimum: 0`, and `type` is a genuine enum — three fields with real,
spec-backed classes to test.

### Step 1 & 2

| Variable           | Class                         | Description                    | Valid?                                                                                        |
| ------------------ | ----------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `code`             | _(duplicate already covered)_ |                                |                                                                                               |
|                    | EC-code-2                     | Missing                        | Invalid — required-field                                                                      |
| `type`             | EC-type-1                     | `"percent"` or `"fixed"`       | Valid                                                                                         |
|                    | EC-type-2                     | Any other string (`"invalid"`) | Invalid — enum violation                                                                      |
|                    | EC-type-3                     | Missing                        | Invalid — required-field                                                                      |
| `discount_value`   | EC-dv-1                       | Positive integer               | Valid                                                                                         |
|                    | EC-dv-2                       | Zero                           | Invalid — boundary (declared `minimum: 1`)                                                    |
|                    | EC-dv-3                       | Negative                       | Invalid — invalid class                                                                       |
|                    | EC-dv-4                       | Missing                        | Invalid — required-field                                                                      |
| `min_order_amount` | EC-moa-1                      | Zero or positive               | Valid (declared `minimum: 0`, so zero itself is valid here — different from `discount_value`) |
|                    | EC-moa-2                      | Negative                       | Invalid — boundary (LB−1)                                                                     |
| `expired_at`       | EC-exp-1                      | A valid future date string     | Valid                                                                                         |
|                    | EC-exp-2                      | A date already in the past     | Invalid — business rule (should a coupon be creatable already-expired?)                       |
|                    | EC-exp-3                      | Not a valid date string at all | Invalid — format                                                                              |
|                    | EC-exp-4                      | Missing                        | Invalid — required-field                                                                      |

### Step 3 — new cases

| #   | Case                                            | Body (delta from a valid baseline)                               | Expected                                                                 | Notes                                                                                                                                                               |
| --- | ----------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Invalid type enum value rejected                | `type: "invalid"`                                                | 400 (verify)                                                             |                                                                                                                                                                     |
| 2   | discount_value of zero rejected                 | `discount_value: 0`                                              | 400 (verify)                                                             | Real declared boundary — LB from `minimum: 1`.                                                                                                                      |
| 3   | discount_value of one accepted                  | `discount_value: 1`                                              | 200                                                                      | The true lower-boundary success case — pairs with case 2.                                                                                                           |
| 4   | Negative discount_value rejected                | `discount_value: -10`                                            | 400 (verify)                                                             |                                                                                                                                                                     |
| 5   | min_order_amount of zero accepted               | `min_order_amount: 0`                                            | 200                                                                      | Correct per the declared `minimum: 0` — zero is valid here, unlike `discount_value`. Worth having explicitly so nobody assumes both fields share the same boundary. |
| 6   | Negative min_order_amount rejected              | `min_order_amount: -1`                                           | 400 (verify)                                                             |                                                                                                                                                                     |
| 7   | Already-expired expired_at accepted or rejected | `expired_at: "2020-01-01"`                                       | 400 (verify) — or if accepted, a genuine business-rule gap worth logging |                                                                                                                                                                     |
| 8   | Missing required fields rejected                | Omit each of `code`/`type`/`discount_value`/`expired_at` in turn | 400 (verify)                                                             | Four single-fault-mode cases, one per required field — not spelled out individually here to save space, but each should be its own case when built.                 |

### Step 4 — BVA

`discount_value` (cases 2–4 above) and `min_order_amount` (cases 5–6) are both
backed by real declared minimums — the cleanest BVA pair in this section,
directly comparable to `price`'s boundary on Products.

---

## `PUT /api/admin/orders/{id}/status` — `status` (enum)

This field is a closed enum, which changes the domain-testing shape: instead of
type/format/boundary classes, the relevant classes are "each valid enum value"
and "any non-enum value" — and the _combination_ of `status` with the order's
current state is what `Material/Document/Methodology/EShop_State_Transition_Testing.md` already covers
exhaustively (25 cells). This section only adds the classes that document
doesn't cover: type and enum-violation on the field itself, independent of
state.

| #   | Case                           | Body                                                             | Expected     | Notes                                                                                                                                                                |
| --- | ------------------------------ | ---------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-enum status value rejected | `{ "status": "shipped_out" }` (not one of the five valid values) | 400 (verify) | Distinct from the state-transition table, which only tests valid enum values against various current states — this tests whether the enum itself is enforced at all. |
| 2   | Non-string status rejected     | `{ "status": 12345 }`                                            | 400 (verify) |                                                                                                                                                                      |
| 3   | Missing status field rejected  | `{}`                                                             | 400 (verify) |                                                                                                                                                                      |

For the full state × target-state matrix, use
`Material/Document/Methodology/EShop_State_Transition_Testing.md` — that document is the authoritative source
for this endpoint's behavior once a _valid_ enum value is confirmed to reach the
handler at all.

---

## Applying this to endpoints not yet touched

Every field-bearing endpoint in the API now has at least the same four-step
treatment reset-password got, at whatever depth its schema actually supports (a
six-field admin form gets six field breakdowns; a one-field category name gets
one). What's left unexplored, lowest priority first: the `search` query
parameter on `GET /api/products` (already has SQL-injection and empty-result
coverage — the remaining gap is a non-string/malformed query value, low value
since it's the same code path as the already-tested cases) and revisiting the
`(verify)`-tagged cases across this whole document once they're actually run,
since several clusters here (especially `POST /api/cart`'s five new cases) are
likely to consolidate into single defect write-ups rather than remain as many
individual open questions.

---

# Original worked example — `POST /api/reset-password`

_(Unchanged from the first version of this document — kept in full below as the
canonical, most-detailed example of the method, since the endpoints above
compress the same reasoning to stay readable at this scale.)_

## Step 1 — Identify input and output variables

From `EShop_OpenApi.yaml`'s `ResetPasswordRequest` schema — three required
fields, all declared `type: string`, no format pattern enforced by the schema
itself:

| Variable      | Declared type              | Notes from source/defects                                                                                                                                                           |
| ------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`       | string                     | Must both be syntactically valid _and_ belong to a registered user — two distinct conditions bundled in one field                                                                   |
| `resetToken`  | string                     | Actual generation logic produces a 4-digit numeric code (`Material/Document/SUT-Reference/EShop_Defect.md`), though the schema doesn't declare that pattern. Never expires; invalidated only by a successful reset. |
| `newPassword` | string, `format: password` | No enforced strength rule confirmed anywhere in the codebase for any endpoint                                                                                                       |

**Output:** success (`200`) or a single documented error branch (`400`,
`"Invalid token or email"`) — the endpoint doesn't distinguish _which_ field was
wrong in its response, which is itself worth noting when the test cases are
built: don't expect a field-specific error message, expect the same generic
`400` regardless of which class was violated.

## Step 2 — Identify equivalence classes, per field

### `email`

| Class      | Description                                                         | Valid?                   |
| ---------- | ------------------------------------------------------------------- | ------------------------ |
| EC-email-1 | Syntactically valid, belongs to a registered user                   | Valid                    |
| EC-email-2 | Not a string (number, boolean, null, array, object)                 | Invalid — type           |
| EC-email-3 | A string, but not a syntactically valid email (`"not-an-email"`)    | Invalid — format         |
| EC-email-4 | Syntactically valid email, but no registered user has it            | Invalid — existence      |
| EC-email-5 | Missing from the request body entirely (key absent, not just empty) | Invalid — required-field |

### `resetToken`

| Class      | Description                                                                         | Valid?                     |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------- |
| EC-token-1 | The real token just issued to this email via `forgot-password`, unused              | Valid                      |
| EC-token-2 | Not a string                                                                        | Invalid — type             |
| EC-token-3 | A string, but clearly the wrong shape (empty, non-numeric, wrong length)            | Invalid — format           |
| EC-token-4 | A plausible-shaped token (another 4-digit number) that doesn't match the issued one | Invalid — wrong value      |
| EC-token-5 | The real token, but already used once in a prior successful reset                   | Invalid — already consumed |
| EC-token-6 | Missing from the request body entirely                                              | Invalid — required-field   |

### `newPassword`

| Class   | Description                            | Valid?                                                |
| ------- | -------------------------------------- | ----------------------------------------------------- |
| EC-pw-1 | A reasonably strong password           | Valid                                                 |
| EC-pw-2 | Not a string                           | Invalid — type                                        |
| EC-pw-3 | Empty string                           | Invalid — boundary (lower)                            |
| EC-pw-4 | A single character                     | Invalid — boundary, if any minimum length is enforced |
| EC-pw-5 | Missing from the request body entirely | Invalid — required-field                              |

## Step 3 — Select test cases

| #   | Case name                                                       | Isolates     | Body                                                                                               | Expected     | Notes                                 |
| --- | --------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------- |
| 1   | Verify reset-password accepts valid input                       | _(baseline)_ | `{ "email": "{{userEmail}}", "resetToken": "{{resetToken}}", "newPassword": "TesterPass123New!" }` | 200          | Combined valid case.                  |
| 2   | Verify reset-password rejects a non-string email                | EC-email-2   | `{ "email": 12345, "resetToken": "{{resetToken}}", "newPassword": "..." }`                         | 400 (verify) |                                       |
| 3   | Verify reset-password rejects a malformed email                 | EC-email-3   | `email: "not-an-email"`                                                                            | 400 (verify) |                                       |
| 4   | Verify reset-password rejects an unregistered email             | EC-email-4   | `email: "nobody@example.com"`                                                                      | 400          | Correct as-is.                        |
| 5   | Verify reset-password rejects a missing email field             | EC-email-5   | Omit `email`                                                                                       | 400 (verify) |                                       |
| 6   | Verify reset-password rejects a non-string token                | EC-token-2   | `resetToken: 1234`                                                                                 | 400 (verify) |                                       |
| 7   | Verify reset-password rejects a malformed-shape token           | EC-token-3   | `resetToken: ""`                                                                                   | 400 (verify) |                                       |
| 8   | Verify reset-password rejects a wrong-but-plausible token       | EC-token-4   | `resetToken: "0000"`                                                                               | 400          | Correct as-is.                        |
| 9   | Verify reset-password rejects an already-used token             | EC-token-5   | Run case 1, then repeat with the same `resetToken`                                                 | 400          | Should genuinely pass — not a defect. |
| 10  | Verify reset-password rejects a missing token field             | EC-token-6   | Omit `resetToken`                                                                                  | 400 (verify) |                                       |
| 11  | Verify reset-password rejects a non-string password             | EC-pw-2      | `newPassword: 12345`                                                                               | 400 (verify) |                                       |
| 12  | Verify reset-password's handling of an empty password           | EC-pw-3      | `newPassword: ""`                                                                                  | 400 (verify) |                                       |
| 13  | Verify reset-password's handling of a single-character password | EC-pw-4      | `newPassword: "a"`                                                                                 | 400 (verify) |                                       |
| 14  | Verify reset-password rejects a missing password field          | EC-pw-5      | Omit `newPassword`                                                                                 | 400 (verify) |                                       |

## Step 4 — Boundary Value Analysis

| Boundary point | Value                      | Case   | Expected     |
| -------------- | -------------------------- | ------ | ------------ |
| LB−1           | 3-digit token              | New    | 400 (verify) |
| LB / UB        | 4-digit token, wrong value | Case 8 | 400          |
| UB+1           | 5-digit token              | New    | 400 (verify) |

`newPassword` has no confirmed length boundary — cases 12–13 probe _whether one
exists_ rather than testing a known one.
