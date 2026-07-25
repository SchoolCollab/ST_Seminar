# EShop SUT — Mis-conventions, Bugs, and Weirdness

## Overview

This document catalogues every deviation between EShop's implementation and
either its declared behaviour (the SRS `README.md` FR-/SEC- rules and
`api_specification.md`) or common REST/security conventions. Each entry cites
the exact `backend/server.js` line so it is verifiable.

Two purposes: it feeds the User Guide's **Failure Modes** section (S4), and
every quirk here is a candidate for the **hand-vs-AI diff** in S3 — the AI,
generating tests from either the OpenAPI spec or the SRS, will not know these
exist.

All references are to `backend/server.js` (572 lines) unless stated. The version
reviewed was the copy captured on Week 06.

## What the SRS says vs what the code does

### Authentication and account safety

**Passwords stored in plaintext (SEC-01 violation).** Line 22–24:
`INSERT INTO users (name, email, password) VALUES (?, ?, ?)` — the request-body
password is written straight to the `users.password` column with no hashing.
Line 46: `if (user.password === password)` confirms plaintext comparison at
login.

**Login-attempt counter increments by 2, not 1 (FR-02 violation).** Line 54:
`const newAttempts = user.login_attempts + 2;`. The SRS explicitly says
"increment by exactly 1 unit." Practical effect: a user is locked after **two**
failed attempts, not three.

**Account lock lasts 180 seconds, not 30 (FR-02 violation).** Line 57:
`lockedUntil = new Date(Date.now() + 180000).toISOString();`. Spec says 30
seconds for the demo environment.

**Locked-account response uses 403, not a dedicated code.** Line 42: locked
account returns `403 Forbidden`. RESTful convention would be `423 Locked` or at
least `401`; using 403 conflates "locked" with "JWT malformed" (also 403, line
106). A client cannot distinguish the two cases from the status alone.

**Login always returns `401` on wrong password OR unknown email (info-leak
protection is correct, but 500-branch is missing).** Lines 37–38 and 53–63: both
cases return the same `"Invalid email or password"`. Good for security. However,
no `try/catch` around DB errors on the login path means any DB exception
surfaces as a raw 500 with the SQLite error message on line 36.

**OTP is 4 digits, not ≥6 (FR-03 and SEC-07 violation).** Line 72:
`Math.floor(1000 + Math.random() * 9000)` generates a 4-digit number. Both the
SRS and the security section require at least 6 digits.

**OTP is returned in the response body — not just in demo mode.** Line 78–81:
`resetToken` is unconditionally in the response. The `api_specification.md`
calls this a demo-only behaviour, but there is no flag guarding it.

**OTP never expires and can be reused across sessions.** Line 87–97: the reset
step only checks that `email + resetToken` matches a stored row. There is no
timestamp check and no `used` flag. The OTP is only invalidated by successful
reset (line 90 sets it to NULL). So an OTP requested five minutes ago is still
valid; an OTP requested a month ago is still valid.

**JWT is never expired.** Line 51:
`jwt.sign({ id: user.id, role: user.role }, SECRET_KEY)` — no `expiresIn`
option. Every token issued lives forever until the signing key rotates.
Confirmed by the working `test_profile.js` file, which mints its own token with
the leaked key and successfully calls `/api/users/me`.

**JWT signing key is checked into the source.** Line 9:
`const SECRET_KEY = "super_secret_key_that_should_not_be_here";`. Anyone with
repo access can forge any user's token, including admin. The uploaded
`test_profile.js` demonstrates this in seven lines.

### Profile and user management

**Client can promote itself to admin (SEC-06 violation).** Line 119–127:
`PUT /api/users/me` pulls `role` from the request body and, if present, appends
`, role = ?` to the UPDATE. A regular user can send `{"role":"admin"}` and
become an administrator on the next request. This is the single most impactful
security defect in the SUT.

**`GET /api/users/me` returns the plaintext password.** Line 112–116:
`db.get("SELECT * FROM users WHERE id = ?", …)` selects every column including
`password`, then `res.json(user)` returns it all. Combined with the
plaintext-storage defect, this means any authenticated user can trivially read
their own stored password.

**`GET /api/users/me` returns HTTP 200 with an undefined body when the token id
no longer maps to a user.** Line 114 does not check `err` or the null-row case;
it just calls `res.json(user)`. If `user` is `undefined`, Express serialises it
as an empty response body but still sends `200 OK`. A client cannot distinguish
"no such user" from a successful empty read.

**Admin can delete their own account.** Lines 504–507:
`DELETE /api/admin/users/:id` runs the DELETE unconditionally. The SRS
explicitly says "cannot delete self." Combined with the no-role-check defect
below, any authenticated user can delete any account, including the last admin.

**`DELETE /api/admin/users/:id` always returns `200`, even when the id did not
exist and even on DB error.** Line 505: the callback ignores `err` and
`this.changes`, so the response is always `"User deleted"`. A caller has no way
to know if the delete actually happened.

### Authorization

**`POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` have
no auth check.** Lines 167, 179, 191: no `authenticateToken` middleware.
`api_specification.md` §3.3 and FR-15 mark these as admin-only. Anyone can
create, modify, or delete products anonymously.

**`GET /api/orders/:id` has no auth check.** Line 344: no `authenticateToken`.
Any anonymous caller can read any order by iterating ids. Spec (FR-11) says
"users only see their own orders."

**All `/api/admin/*` endpoints check the token but not the role.** Every admin
endpoint uses `authenticateToken`, which only verifies the JWT signature (line
105–109). None of them checks `req.user.role === 'admin'`. Combined with the
self-promotion defect above, a regular user can promote themselves and then use
every admin endpoint. This is the SEC-03 violation the SRS explicitly warns
against.

**`GET /api/coupons` requires a token but has no role check (spec:
admin-only).** Line 356: `authenticateToken` but no role gate. Any authenticated
user can list all coupons, expired or otherwise, including their
`discount_value` and internal IDs.

### Products

**`GET /api/products?search=` concatenates SQL directly (SEC-05 violation,
classic SQL injection).** Line 144:
`` `SELECT * FROM products WHERE name LIKE '%${searchQuery}%'` ``. A query like
`?search='; DROP TABLE products;--` reaches the DB unescaped.

**`GET /api/products?search=` returns HTML, not JSON, on SQL error.** Line 149:
``res.status(500).send(`<h1>Database Error</h1><p>${err.message}</p>`)``. All
other error branches in the code return JSON. A client parsing the response as
JSON will crash on this branch. Also leaks the SQLite error message verbatim,
which is an information disclosure.

**`GET /api/products/:id` returns `{}` with `200 OK` when the product does not
exist.** Line 161: `if (!row) return res.status(200).json({});`. RESTful
convention is `404 Not Found`. A client cannot distinguish "product deleted"
from "product with no fields."

**`GET /api/products/:id` returns `price` as a string when `id` is even.** Line
162: `if (row.id % 2 === 0) row.price = row.price.toString();`. There is no
reasonable explanation for this — it looks like a deliberately-planted testing
quirk. It breaks any client that types the field.

**`POST /api/admin/import-products` is not transactional (FR-16 violation).**
Lines 199–241: uses a prepared statement in a `forEach` loop with no
`BEGIN`/`COMMIT`/`ROLLBACK`. Rows with `!row.name` are skipped by pushing to
`errors`; rows with DB failures are also pushed to `errors` and other rows
commit anyway. FR-16 requires "all-or-nothing." Partial imports occur.

**`POST /api/admin/import-products` also has no auth check for admin role.**
Line 199: `authenticateToken` only. Any authenticated user can bulk-import
products.

**`POST /api/admin/import-products` uses `stmt.finalize()` before all row
callbacks complete.** Lines 234–240: `finalize` is called synchronously after
the `forEach` returns, but the `stmt.run` callbacks are asynchronous. The
response's `inserted` and `errors` values are read _before_ those callbacks
fire. The reported counts are almost always wrong. This is a real concurrency
bug, not a mis-convention.

### Cart

**Cart is stored in memory, not persisted (FR-07 side-effect).** Line 14:
`const userCarts = {};`. Restarting the server wipes every user's cart. Not
called out in the SRS, but it means Pact provider verification cannot rely on
cart state surviving between test runs.

**`POST /api/cart` accepts any JSON body — no schema validation.** Line 293:
`userCarts[userId].push(req.body);` writes the request body verbatim into the
cart array. A client can push `{}`, or an array, or a nested object — the cart
happily stores it.

**`POST /api/cart` does not merge duplicate product IDs (FR-07 violation).**
Same line. Adding the same product twice creates two entries. FR-07 explicitly
says "adding the same product must increment quantity, not create a new row."

**No `DELETE /api/cart/:id`, no `PUT /api/cart/:id`.** The SRS shows `+`/`-`
buttons for quantity and a delete-with-confirm action, but there are no
cart-item modification endpoints. The frontend must either replace the whole
cart client-side or POST modified copies — undocumented behaviour either way.

### Checkout and orders

**`POST /api/checkout` trusts the client-supplied `total_amount` (FR-08
violation).** Lines 297–309: the `total_amount` from the request body is written
straight to `orders.total_amount`. FR-08 explicitly says the backend must
recompute from the cart and reject client-sent values.

**`POST /api/checkout` does not touch or empty the cart.** Line 297–309: no
interaction with `userCarts`. FR-08 says "after successful checkout, the cart is
cleared" — instead, the cart still holds the same items after checkout, so the
same items can be checked out again.

**`POST /api/checkout` does not link the order to the cart items.** The order
stores only `total_amount` and `shipping_address`. There is no `order_items`
table populated. `GET /api/orders/:id` returns an order with no line-items — the
SRS's FR-10 talks about state transitions but not explicitly about items, so
this is a mis-convention rather than a hard spec violation.

**`PUT /api/orders/:id/cancel` allows cancelling a `shipping` order (FR-10
violation).** Line 329: the guard is
`if (order.status === "delivered" || order.status === "canceled")`. Only
`delivered` and `canceled` are refused. The SRS state machine says only
`pending` and `confirmed` may be user-cancelled — once in `shipping`, only admin
may transition. The inline Vietnamese comment on line 328 (`Lẽ ra phải là…`)
literally says "it should have been" — a deliberately-planted bug.

**Admin state machine allows `canceled → delivered` (FR-10 violation).** Lines
550–551: an explicit
`if (currentStatus === "canceled" && status === "delivered") isValidTransition = true;`.
The SRS calls `canceled` and `delivered` final states. An admin can resurrect a
cancelled order into delivered.

**Order-cancel and status-update handlers ignore DB write errors.** Lines
336–338 and 559–564: `db.run` callbacks receive `err` but never check it. If the
UPDATE fails, the client still gets `200 OK` with `"canceled successfully"` or
`"status updated"`.

**`GET /api/orders/:id` also ignores the `err` argument.** Line 345:
`db.get(...(err, order)` but `err` is never checked. On DB error the callback
runs with both `err` and `order` set — actually, `order` will be `undefined`, so
it returns `404` masking the real failure.

### Coupons

**Threshold check uses `>` instead of `>=` (FR-09 C3 violation).** Line 379:
`if (total_amount > coupon.min_order_amount)`. FR-09 condition C3 says
"`>= (greater than or equal)` `min_order_amount`." An order that exactly meets
the threshold is rejected as being below it.

**Percent discount formula is mathematically wrong (FR-09 violation).** Lines
399–401 and 419–421:
`discount_amount = Math.floor(total_amount * (1 - coupon.discount_value))`. The
correct formula per FR-09 is `total × discount_value / 100`. With
`discount_value = 10` (meant as 10%), the code computes
`total * (1 - 10) = total * -9`, giving a _negative_ discount that, when
subtracted, produces a `final_amount` **larger than the original**. Test this
before you demo — this may be the most impactful business defect in the SUT.

**`user_id` is optional in `POST /api/apply-coupon`, silently bypassing the
per-user usage limit.** Line 386: `if (user_id)` — when omitted, the entire
max-uses-per-user check (C5) is skipped. A client that just doesn't send
`user_id` gets unlimited usage.

**Expiry check happens after minimum-threshold check, so an expired coupon on a
small order returns "below minimum" not "expired."** Lines 379–384: outer
`if total_amount > min` opens; inside that block the expiry is checked. If the
order is below the threshold, the caller is told "not enough" instead of
"expired" — misleading error hierarchy.

**`is_active` is not verified separately.** Line 370: the SELECT filters by
`code = ? AND is_active = 1`, so an inactive coupon returns 404 with "does not
exist." That collapses C1 (exists) and the active check into one error message.

**`POST /api/coupon-usage` does not verify that the user actually checked out.**
Line 444: it inserts into `coupon_usage` on demand, with no cross-reference to
any order. A client can call this endpoint with any `coupon_id` to bump their
own usage counter — or _not_ call it, and get unlimited uses.

### Response conventions

**Every success returns `200`, never `201` or `204`.** The SRS does not specify
status codes, but RESTful convention would return `201 Created` for POST-creates
(`/api/register`, `/api/products`, `/api/categories`, `/api/admin/coupons`,
`/api/checkout`) and `204 No Content` for DELETEs. All return `200` with
`{ message, id? }`.

**Categories endpoints have no `GET /api/categories/:id` (spec silence).** The
SRS mentions category CRUD but the API only exposes list/create/update/delete.
Fetching a single category by id must go through the list endpoint.

**`GET /api/categories` and `GET /api/products` ignore DB errors and pass
`undefined` rows through.** Lines 154, 244: neither handler checks `err` before
calling `res.json(rows)`. On DB failure, `rows` is `undefined`, and the response
is empty with `200 OK`.

### Environment and infrastructure

**`SECRET_KEY` in source, `cors()` opens all origins.** Lines 9 and 11: no
environment-variable indirection, no CORS restrictions. Combined they mean any
web page anywhere can call any authenticated endpoint with a forged token.
Standard student-project shape, but worth noting.

**No rate limiting anywhere.** The login-lockout is the only throttle in the
codebase, and its trigger is off-by-one. The apply-coupon, register, and
forgot-password endpoints have none.

**`bodyParser` has no size limit.** Line 12: default limits apply, but no
explicit `limit` was set — a large POST to `/api/admin/import-products` could
exhaust memory since the whole array is held in scope.

**No error middleware.** Nothing catches uncaught exceptions or unhandled
promise rejections; a synchronous throw in a route handler will crash the
process.

## What the OpenAPI spec inherits vs adds

Cross-referenced against the current `eshop_openapi.yaml` (implementation-truth
version):

**Correctly documented in the OpenAPI spec:** the plaintext-password return,
login-attempts +2, 180 s lock, 4-digit OTP, `role` accepted in profile update,
HTML-on-SQL-error, `{}` on 404, string `price` on even ids, no-auth on product
CRUD, cart no-merge, checkout trusting `total_amount`, cancel-while-shipping,
no-auth on `/api/orders/:id`, `>` vs `>=`, percent-formula bug,
`canceled → delivered`, self-delete, always-200 on delete.

**NOT documented in the OpenAPI spec — spotted from reading the source
directly:**

- JWT has no expiry (line 51).
- `SECRET_KEY` is checked into the repo (line 9).
- OTP never expires (lines 87–90).
- `GET /api/users/me` returns 200 with an empty body when the token id has no
  matching row.
- `POST /api/checkout` does not clear the cart.
- `POST /api/checkout` does not link items to the order.
- `POST /api/admin/import-products` reports counts before its callbacks fire
  (async bug).
- `POST /api/coupon-usage` has no cross-reference to a real order.
- `POST /api/cart` accepts any JSON shape, not just `CartItem`.
- Expiry-vs-minimum error hierarchy is misleading in `/api/apply-coupon`.
- `GET /api/products` and `GET /api/categories` silently return empty on DB
  failure.
- No cart-item update or delete endpoints exist.

Add these to the OpenAPI spec's inline notes (or catalogue them in the User
Guide's Failure Modes section — either works).

## How to use this for the seminar

**In the S3 hand-vs-AI diff:** the AI, generating tests from the OpenAPI spec,
will produce assertions consistent with the _documented buggy_ behaviour. It
will assert `login_attempts + 2`, `role` accepted in profile, `{}` on 404. What
it will not do is generate tests that check for the _undocumented_ quirks in the
second list above (no cart clear on checkout, JWT never expiring, OTP never
expiring). Those are the concrete rows for the "what AI missed" column of the
diff.

**In the User Guide's Failure Modes section (S4):** three real ways Apidog can
mislead you, drawn from this catalogue — (a) generating an assertion on the
`role` field of `UpdateProfileRequest`, which is documented in the spec but
should never appear in valid requests; (b) accepting `{}` with 200 as a "product
not found" case, which is technically correct against the buggy spec but wrong
against the intended contract; (c) not testing that the cart is cleared after
checkout, because the spec has no explicit "cart cleared" response contract to
assert on.

**In the S6 audience activity:** the coupon-percent formula and the
`canceled → delivered` transition are the two most demo-friendly bugs — both are
easy to trigger in a single request and both produce visibly wrong results.

## Verification note

Every claim in this document was verified against the source of
`backend/server.js` reviewed in Week 06 (572 lines). The behaviours documented
here may change in future commits; before demoing any of them, re-verify against
the running server, especially the numeric constants (180 s lock, 4-digit OTP)
and the coupon math.
