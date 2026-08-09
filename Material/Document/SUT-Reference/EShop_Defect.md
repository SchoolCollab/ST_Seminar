# EShop SUT — Known Defects and Mis-conventions

## Overview

This document catalogues every observed deviation between EShop's implementation
and either its declared behaviour (SRS `README.md` FR- and SEC- rules, plus
`api_specification.md`) or standard REST conventions. Each entry cites the
source file and line so it is verifiable.

References are to `backend/server.js` (643 lines as of this pass) unless
stated otherwise. Line numbers drift as the file is edited; if a citation is
off by a few lines, the quoted code snippet is the source of truth.

## Authentication and account safety

**Passwords stored in plaintext (SEC-01).** `server.js:61` inserts the
request-body password into `users.password` with no hashing. `server.js:87`
confirms plaintext comparison at login.

**Login-attempt counter increments by 2 (FR-02).** `server.js:95`:
`newAttempts = user.login_attempts + 2`. SRS requires +1. Effect: lockout after
**two** failed attempts.

**Account lock lasts 180 seconds (FR-02).** `server.js:98`:
`Date.now() + 180000`. SRS specifies 30 seconds.

**Locked-account uses `403 Forbidden`.** `server.js:81–84`. Same status is
returned for JWT-invalid (`server.js:147`), making the two indistinguishable to
a client.

**OTP is 4 digits (FR-03, SEC-07).** `server.js:113`:
`Math.floor(1000 + Math.random() * 9000)`. SRS requires ≥6.

**OTP is unconditionally returned in the response body.** `server.js:119–122`.
`api_specification.md` frames this as demo-only; the code has no such guard.

**OTP never expires and can be reused.** `server.js:124–134`. No timestamp
check; the token is only invalidated by a successful reset. A month-old OTP is
still valid.

**JWT is never expired.** `server.js:92`: `jwt.sign(...)` with no `expiresIn`.
Confirmed by the uploaded `test_profile.js`, which forges a valid token in seven
lines.

**`SECRET_KEY` is hard-coded in source.** `server.js:9`:
`"super_secret_key_that_should_not_be_here"`. Repo access enables forging any
user's token, including admin.

## Profile and user management

**Client can promote itself to admin (SEC-06).** `server.js:159–171`:
`PUT /api/users/me` accepts `role` from the request body and, if present,
updates it. Sending `{"role":"admin"}` grants administrator privileges
immediately.

**`GET /api/users/me` returns plaintext password.** `server.js:153–155`:
`SELECT * FROM users` is returned verbatim, `password` column included.

**`GET /api/users/me` returns `200` with an empty body when the token id has no
matching row.** `server.js:154` does not check `err` or a null row;
`res.json(undefined)` yields `200 OK` with an empty response.

**Admin can delete their own account (FR-19).** `server.js:568`:
unconditional DELETE. SRS forbids self-delete.

**Admin user list omits `phone` although the admin UI renders it.**
`server.js:559` selects `id, name, email, role, login_attempts,
locked_until, shipping_address` from `users`, but not `phone`. The admin
frontend renders `u.phone` in its user table, so that column is always empty
even when user phone data exists.

**Mobile profile update sends `shippingAddress`, but the backend reads
`shipping_address`.** `frontend-mobile/App.js:280–283` submits the profile form
through the mobile API client with a camelCase `shippingAddress` value, while
`server.js:160,162` destructures `shipping_address` and writes that missing
snake_case value into `users.shipping_address`. The request can still return
`200`, so the mobile UI appears to save the address while the database silently
stores `NULL`/`undefined`. This is the second independent consumer-facing
shipping-address naming failure found today: `frontend-web` checkout and
`frontend-mobile` profile update hit unrelated endpoints, but both expose the
same class of backend/API field-name carelessness.

**`DELETE /api/admin/users/:id` always returns `200`.** `server.js:568`:
callback ignores `err` and `this.changes`. No signal of failure or missing id.

## Authorization

**No auth on `POST/PUT/DELETE /api/products`.** `server.js:212`, `224`, `236`:
no `authenticateToken` middleware. SRS FR-15 and `api_specification.md` §3.3
mark these admin-only.

**No auth on `GET /api/orders/:id`.** `server.js:396`: anonymous callers can
read any order by iterating ids. FR-11 requires owner-only access.

**All `/api/admin/*` endpoints check the token but not the role.**
`server.js:141–149` (`authenticateToken`): verifies signature only. Combined
with the self-promotion defect above, any authenticated user reaches every
admin endpoint. Violates SEC-03.

**`GET /api/coupons` requires only a token, not admin role.** `server.js:413`.
`api_specification.md` §5.2 marks this admin-only.

## Products

**`GET /api/products?search=` concatenates SQL (SEC-05).** `server.js:185`:
template literal into the query string. Classic injection.

**`GET /api/products?search=` returns HTML on SQL error.** `server.js:190`:
`res.status(500).send('<h1>Database Error</h1>...')`. Other error branches
return JSON. Also leaks the raw SQLite error message.

**`GET /api/products/:id` returns `{}` with `200` when the product does not
exist.** `server.js:205`: `if (!row) return res.status(200).json({});`.
Convention is `404`.

**`GET /api/products/:id` returns `price` as a string when `id` is even.**
`server.js:206`: `if (row.id % 2 === 0) row.price = row.price.toString();`.
Breaks any typed client.

**`POST /api/admin/import-products` is not transactional (FR-16).**
`server.js:248–286`: prepared statement inside `forEach`, no `BEGIN`/`COMMIT`.
Rows with `!row.name` are skipped; other rows commit anyway. Partial imports
occur.

**`POST /api/admin/import-products` no longer misreports counts — previously
fixed.** `server.js:283–289`: `stmt.finalize(callback)` now correctly waits for
every queued `stmt.run` to complete before the callback (and therefore
`res.json`) runs, so `inserted`/`errors` are populated accurately. This entry
previously claimed the response fired before the callbacks resolved; that is no
longer true and the claim is retracted here rather than left stale. The
non-transactional defect immediately above is unaffected and still real.

**`POST /api/admin/import-products` has no role check.** `server.js:248`:
`authenticateToken` only.

## Cart

**Cart is stored in memory (`server.js:52`).** Server restart wipes every cart.
Not called out in the SRS.

**`POST /api/cart` accepts any JSON shape.** `server.js:342`:
`userCarts[userId].push(req.body)` — no schema validation.

**`POST /api/cart` does not merge duplicate product IDs (FR-07).** Same line.
Adding the same product twice creates two entries; FR-07 requires incrementing
quantity.

**No `PUT`/`DELETE` on cart items.** The SRS frontend shows `+`/`−` and delete
buttons; no matching backend endpoints exist.

## Checkout and orders

**`POST /api/checkout` trusts client-supplied `total_amount` (FR-08).**
`server.js:346–356`: the request-body value is written straight to
`orders.total_amount`. FR-08 requires backend recomputation.

**`POST /api/checkout` does not clear the cart.** Same handler: no `userCarts`
interaction. FR-08 requires the cart to be cleared on success.

**`POST /api/checkout` does not link the order to cart items.** Same handler:
only `total_amount` and `shipping_address` are stored. There is no `order_items`
population.

**`POST /api/checkout` stores no shipping address for real web checkouts.**
`Checkout.jsx:47–53` sends `{ items, total_amount, coupon_id }`, but
`server.js:348` still destructures `shipping_address` from the request body and
`server.js:352` writes that missing value into `orders.shipping_address`.
Result: orders created by the real `frontend-web` checkout flow silently
persist a null/undefined shipping address. Found by correcting the Pact
checkout contract to match the real consumer request shape; the older
inaccurate contract had included `shipping_address` and therefore masked this
integration bug.

**Mobile checkout drops the last cart item when the cart has more than one
item.** `frontend-mobile/App.js:354` sends
`items: cart.length > 1 ? cart.slice(0, -1) : cart` to `POST /api/checkout`.
For a cart with two or more entries, `slice(0, -1)` removes the final item before
the request is sent, so a real mobile checkout silently omits a cart item. This
is a consumer-side functional bug, not a useful provider contract expectation.

**`PUT /api/orders/:id/cancel` allows cancelling a `shipping` order (FR-10).**
`server.js:379`: guard is
`if (order.status === "delivered" || order.status === "canceled")`. Only those
two are refused. SRS state machine allows user cancel only from `pending` or
`confirmed`. Inline comment on `server.js:378` — "Lẽ ra phải là…" — flags this
as intentional.

**Admin state machine allows `canceled → delivered` (FR-10).**
`server.js:614`: explicit
`if (currentStatus === "canceled" && status === "delivered") isValidTransition = true`.
SRS calls both `canceled` and `delivered` final.

**Cancel and status-update handlers ignore DB write errors.**
`server.js:386–389`, `624–627`: `err` is never checked. Failed UPDATE still
returns `200`.

**`GET /api/orders/:id` ignores its `err` argument.** `server.js:396–404`. DB
error surfaces as `404` because `order` is `undefined`, masking the real
failure.

## Coupons

**Threshold check uses `>` instead of `>=` (FR-09 C3).** `server.js:438`:
`if (total_amount > coupon.min_order_amount)`. An order exactly at the threshold
is rejected.

**Percent discount formula is inverted (FR-09).** `server.js:462–464` (and
duplicated at `482–484`):
`discount_amount = Math.floor(total_amount * (1 - coupon.discount_value))`. With
`discount_value = 10`, the code computes `total × -9`, producing a _negative
discount_ and a `final_amount` **larger than the original**. Correct formula per
FR-09 is `total × discount_value / 100`.

**`user_id` is optional, silently bypassing max-uses-per-user (FR-09 C5).**
`server.js:447`: `if (user_id)` wraps the entire limit check. Omit the field and
the coupon has unlimited uses.

**Expired-coupon check runs _after_ the minimum-threshold check.**
`server.js:438–443`: an expired coupon on a small order returns "below minimum"
instead of "expired." Misleading error hierarchy.

**`is_active` is collapsed into "does not exist."** `server.js:427`:
`WHERE code = ? AND is_active = 1`. An inactive coupon returns `404` with "does
not exist," conflating C1 with the active check.

**`POST /api/coupon-usage` does not verify a real order.** `server.js:510`:
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
`server.js:194`, `293`: neither checks `err` before `res.json(rows)`. On DB
failure the response is empty with `200 OK`.

**Inconsistent field-naming convention for newly-created-row identifiers.**
`server.js:63–66` (`POST /api/register`) and `server.js:219`
(`POST /api/products`) both return `{ message, id }`. `server.js:355`
(`POST /api/checkout`) returns `{ message, orderId }` — camelCase, breaking from
the `id` convention used by the other two create-endpoints of the same shape.
The rest of the API's field names are consistently snake_case (`category_id`,
`discount_amount`, `min_order_amount`, `login_attempts`, etc.); `orderId`,
`imageUrl` (also a DB column, `server.js:215`), and `resetToken`/`newPassword`
are the only camelCase outliers. Found via a Pact consumer contract that
asserted `order_id` and failed against the real `orderId` response — the
contract's own expectation was not itself correct (the OpenAPI spec already
documents `orderId` accurately), but chasing the mismatch surfaced this genuine
internal inconsistency in the SUT's naming convention across otherwise-uniform
endpoints.

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
