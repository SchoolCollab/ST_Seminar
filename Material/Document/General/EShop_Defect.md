# EShop SUT — Known Defects and Mis-conventions

## Overview

This document catalogues every observed deviation between EShop's implementation
and either its declared behaviour (SRS `README.md` FR- and SEC- rules, plus
`api_specification.md`) or standard REST conventions. Each entry cites the
source file and line so it is verifiable.

References are to `backend/server.js` (572 lines) unless stated otherwise.

## Authentication and account safety

**Passwords stored in plaintext (SEC-01).** `server.js:22–24` inserts the
request-body password into `users.password` with no hashing. `server.js:46`
confirms plaintext comparison at login.

**Login-attempt counter increments by 2 (FR-02).** `server.js:54`:
`newAttempts = user.login_attempts + 2`. SRS requires +1. Effect: lockout after
**two** failed attempts.

**Account lock lasts 180 seconds (FR-02).** `server.js:57`:
`Date.now() + 180000`. SRS specifies 30 seconds.

**Locked-account uses `403 Forbidden`.** `server.js:42`. Same status is returned
for JWT-invalid (`server.js:106`), making the two indistinguishable to a client.

**OTP is 4 digits (FR-03, SEC-07).** `server.js:72`:
`Math.floor(1000 + Math.random() * 9000)`. SRS requires ≥6.

**OTP is unconditionally returned in the response body.** `server.js:78–81`.
`api_specification.md` frames this as demo-only; the code has no such guard.

**OTP never expires and can be reused.** `server.js:87–97`. No timestamp check;
the token is only invalidated by a successful reset. A month-old OTP is still
valid.

**JWT is never expired.** `server.js:51`: `jwt.sign(...)` with no `expiresIn`.
Confirmed by the uploaded `test_profile.js`, which forges a valid token in seven
lines.

**`SECRET_KEY` is hard-coded in source.** `server.js:9`:
`"super_secret_key_that_should_not_be_here"`. Repo access enables forging any
user's token, including admin.

## Profile and user management

**Client can promote itself to admin (SEC-06).** `server.js:119–127`:
`PUT /api/users/me` accepts `role` from the request body and, if present,
updates it. Sending `{"role":"admin"}` grants administrator privileges
immediately.

**`GET /api/users/me` returns plaintext password.** `server.js:112–116`:
`SELECT * FROM users` is returned verbatim, `password` column included.

**`GET /api/users/me` returns `200` with an empty body when the token id has no
matching row.** `server.js:114` does not check `err` or a null row;
`res.json(undefined)` yields `200 OK` with an empty response.

**Admin can delete their own account (FR-19).** `server.js:504–507`:
unconditional DELETE. SRS forbids self-delete.

**Admin user list omits `phone` although the admin UI renders it.**
`server.js:540–547` selects `id, name, email, role, login_attempts,
locked_until, shipping_address` from `users`, but not `phone`. The admin
frontend renders `u.phone` in its user table, so that column is always empty
even when user phone data exists.

**`DELETE /api/admin/users/:id` always returns `200`.** `server.js:505`:
callback ignores `err` and `this.changes`. No signal of failure or missing id.

## Authorization

**No auth on `POST/PUT/DELETE /api/products`.** `server.js:167`, `179`, `191`:
no `authenticateToken` middleware. SRS FR-15 and `api_specification.md` §3.3
mark these admin-only.

**No auth on `GET /api/orders/:id`.** `server.js:344`: anonymous callers can
read any order by iterating ids. FR-11 requires owner-only access.

**All `/api/admin/*` endpoints check the token but not the role.**
`server.js:105–109`: `authenticateToken` verifies signature only. Combined with
the self-promotion defect above, any authenticated user reaches every admin
endpoint. Violates SEC-03.

**`GET /api/coupons` requires only a token, not admin role.** `server.js:356`.
`api_specification.md` §5.2 marks this admin-only.

## Products

**`GET /api/products?search=` concatenates SQL (SEC-05).** `server.js:144`:
template literal into the query string. Classic injection.

**`GET /api/products?search=` returns HTML on SQL error.** `server.js:149`:
`res.status(500).send('<h1>Database Error</h1>...')`. Other error branches
return JSON. Also leaks the raw SQLite error message.

**`GET /api/products/:id` returns `{}` with `200` when the product does not
exist.** `server.js:161`: `if (!row) return res.status(200).json({});`.
Convention is `404`.

**`GET /api/products/:id` returns `price` as a string when `id` is even.**
`server.js:162`: `if (row.id % 2 === 0) row.price = row.price.toString();`.
Breaks any typed client.

**`POST /api/admin/import-products` is not transactional (FR-16).**
`server.js:199–241`: prepared statement inside `forEach`, no `BEGIN`/`COMMIT`.
Rows with `!row.name` are skipped; other rows commit anyway. Partial imports
occur.

**`POST /api/admin/import-products` reports counts before its callbacks fire.**
`server.js:234–240`: `stmt.finalize()` runs synchronously after the `forEach`,
but the `stmt.run` callbacks are asynchronous. `inserted` and `errors` are read
_before_ they are populated. Reported counts are almost always wrong.

**`POST /api/admin/import-products` has no role check.** `server.js:199`:
`authenticateToken` only.

## Cart

**Cart is stored in memory (`server.js:14`).** Server restart wipes every cart.
Not called out in the SRS.

**`POST /api/cart` accepts any JSON shape.** `server.js:293`:
`userCarts[userId].push(req.body)` — no schema validation.

**`POST /api/cart` does not merge duplicate product IDs (FR-07).** Same line.
Adding the same product twice creates two entries; FR-07 requires incrementing
quantity.

**No `PUT`/`DELETE` on cart items.** The SRS frontend shows `+`/`−` and delete
buttons; no matching backend endpoints exist.

## Checkout and orders

**`POST /api/checkout` trusts client-supplied `total_amount` (FR-08).**
`server.js:297–309`: the request-body value is written straight to
`orders.total_amount`. FR-08 requires backend recomputation.

**`POST /api/checkout` does not clear the cart.** Same handler: no `userCarts`
interaction. FR-08 requires the cart to be cleared on success.

**`POST /api/checkout` does not link the order to cart items.** Same handler:
only `total_amount` and `shipping_address` are stored. There is no `order_items`
population.

**`POST /api/checkout` stores no shipping address for real web checkouts.**
`Checkout.jsx:47–53` sends `{ items, total_amount, coupon_id }`, but
`server.js:331` still destructures `shipping_address` from the request body and
`server.js:335` writes that missing value into `orders.shipping_address`. Result:
orders created by the real `frontend-web` checkout flow silently persist a
null/undefined shipping address. Found by correcting the Pact checkout contract
to match the real consumer request shape; the older inaccurate contract had
included `shipping_address` and therefore masked this integration bug.

**`PUT /api/orders/:id/cancel` allows cancelling a `shipping` order (FR-10).**
`server.js:329`: guard is
`if (order.status === "delivered" || order.status === "canceled")`. Only those
two are refused. SRS state machine allows user cancel only from `pending` or
`confirmed`. Inline comment on `server.js:328` — "Lẽ ra phải là…" — flags this
as intentional.

**Admin state machine allows `canceled → delivered` (FR-10).**
`server.js:550–551`: explicit
`if (currentStatus === "canceled" && status === "delivered") isValidTransition = true`.
SRS calls both `canceled` and `delivered` final.

**Cancel and status-update handlers ignore DB write errors.**
`server.js:336–338`, `559–564`: `err` is never checked. Failed UPDATE still
returns `200`.

**`GET /api/orders/:id` ignores its `err` argument.** `server.js:345`. DB error
surfaces as `404` because `order` is `undefined`, masking the real failure.

## Coupons

**Threshold check uses `>` instead of `>=` (FR-09 C3).** `server.js:379`:
`if (total_amount > coupon.min_order_amount)`. An order exactly at the threshold
is rejected.

**Percent discount formula is inverted (FR-09).** `server.js:399–401` (and
duplicated at `419–421`):
`discount_amount = Math.floor(total_amount * (1 - coupon.discount_value))`. With
`discount_value = 10`, the code computes `total × -9`, producing a _negative
discount_ and a `final_amount` **larger than the original**. Correct formula per
FR-09 is `total × discount_value / 100`.

**`user_id` is optional, silently bypassing max-uses-per-user (FR-09 C5).**
`server.js:386`: `if (user_id)` wraps the entire limit check. Omit the field and
the coupon has unlimited uses.

**Expired-coupon check runs _after_ the minimum-threshold check.**
`server.js:379–384`: an expired coupon on a small order returns "below minimum"
instead of "expired." Misleading error hierarchy.

**`is_active` is collapsed into "does not exist."** `server.js:370`:
`WHERE code = ? AND is_active = 1`. An inactive coupon returns `404` with "does
not exist," conflating C1 with the active check.

**`POST /api/coupon-usage` does not verify a real order.** `server.js:444`:
inserts into `coupon_usage` on demand with no cross-reference to any order. A
client can bump their own usage counter arbitrarily, or skip the endpoint
entirely for unlimited real uses.

## Response conventions

**All success responses use `200`; never `201` or `204`.** POST-creates
(`/api/register`, `/api/products`, `/api/categories`, `/api/admin/coupons`,
`/api/checkout`) return `200 { message, id }` instead of `201 Created`. DELETEs
return `200 { message }` instead of `204 No Content`.

**No `GET /api/categories/:id`.** The API exposes list/create/update/delete
only. Single-category reads must go through the list endpoint.

**`GET /api/products` and `GET /api/categories` swallow DB errors.**
`server.js:154`, `244`: neither checks `err` before `res.json(rows)`. On DB
failure the response is empty with `200 OK`.

**Inconsistent field-naming convention for newly-created-row identifiers.**
`server.js:27` (`POST /api/register`) and `server.js:174` (`POST /api/products`)
both return `{ message, id }`. `server.js:306` (`POST /api/checkout`) returns
`{ message, orderId }` — camelCase, breaking from the `id` convention used by
the other two create-endpoints of the same shape. The rest of the API's field
names are consistently snake_case (`category_id`, `discount_amount`,
`min_order_amount`, `login_attempts`, etc.); `orderId`, `imageUrl` (also a DB
column, `server.js:170`), and `resetToken`/`newPassword` are the only camelCase
outliers. Found via a Pact consumer contract that asserted `order_id` and failed
against the real `orderId` response — the contract's own expectation was not
itself correct (the OpenAPI spec already documents `orderId` accurately), but
chasing the mismatch surfaced this genuine internal inconsistency in the SUT's
naming convention across otherwise-uniform endpoints.

## Environment and infrastructure

**`cors()` opens all origins.** `server.js:11`. Combined with the leaked
`SECRET_KEY`, any web page can call any authenticated endpoint with a forged
token.

**No rate limiting.** The login-lockout is the only throttle, and its trigger is
off-by-one. Register, apply-coupon, and forgot-password have none.

**`bodyParser` has no explicit size limit.** `server.js:12`. Defaults apply; a
large POST to `/api/admin/import-products` is unbounded in scope.

**No error middleware.** Uncaught exceptions or unhandled promise rejections in
a route handler will crash the process.
