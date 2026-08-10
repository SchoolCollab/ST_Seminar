# EShop Apidog TestSuite Failure Classification

## Source Run

Latest classified report:
`Material/Config/Apidog/Report/apidog-reports-2026-08-10-15-59-56.html`

Apidog report totals:

| Metric | Value |
| ------ | ----- |
| HTTP requests | 263 |
| Failed requests | 109 |
| Assertions | 282 |
| Failed assertions | 115 |
| Passed | 58.56% |
| Failed | 41.44% |
| Untested | 0.00% |

Parser note: the report contains 104 request cards with failed assertions and
115 failed assertions. Apidog's own 109 failed-request count is broader than
"cards with failed assertions"; it can include HTTP/request-level failures that
do not contribute a failed assertion row. The classification below is therefore
based on the failed-assertion cards, with the Apidog report totals preserved
above as the official run summary.

## Classification Summary

| Classification | Failed request cards | Failed assertions | Meaning |
| -------------- | -------------------- | ----------------- | ------- |
| Known SUT defect evidence | 20 | 20 | Failures that confirm already-known or newly-classified EShop behavior gaps. Keep as defect evidence. |
| SUT validation/permissiveness gap | 50 | 50 | The backend accepts malformed or incomplete inputs where stricter API validation was expected. Valid red behavior, but mostly broad validation debt rather than one named defect per case. |
| Test-design leftover | 3 | 3 | The test case itself does not send what its title/oracle claims. Fix or remove before treating the suite as a final green regression suite. |
| AI-generated oracle/noise | 31 | 42 | AI-generated cases whose expected status/body is speculative or inconsistent with the concrete request Apidog executed. Review manually before promotion. |

Total classified failed-assertion cards: 104 request cards / 115 failed
assertions.

## Known SUT Defect Evidence

These failures are useful evidence because the test case checks behavior that
the SUT should enforce, and the observed response matches a documented or
defect-worthy implementation gap.

| Area | Evidence |
| ---- | -------- |
| Admin authorization / SEC-06 class | Regular-user bearer token accepted on admin-only operations, including admin order status update, product import, coupon create/delete, admin-user listing/deletion, and admin-order listing. |
| Admin order state transition | `PUT /api/admin/orders/1/status` accepts `canceled -> delivered`; this is the STT-A-24 defect class already tracked in the state-transition evidence. |
| Product detail not-found behavior | `GET /api/products/999999` returns success-like behavior instead of a clean not-found response. |
| Order ownership/auth gap | `GET /api/orders/1` succeeds where the test expected the order to be protected from an inappropriate requester. |
| Coupon minimum boundary | `POST /api/apply-coupon` rejects the exact minimum-order boundary; this matches the known greater-than vs. greater-than-or-equal boundary issue. |
| Coupon code type/error hierarchy | A non-string coupon code produces not-found behavior instead of request validation. |
| Coupon usage validation | `POST /api/coupon-usage` accepts missing or malformed coupon/order usage payloads. |
| Delete nonexistent product | `DELETE /api/products/999999` returns success instead of not found. |
| Bulk import partial-invalid array | `POST /api/admin/import-products` accepts a partially invalid array instead of rejecting or reporting a transaction-level failure. |
| Admin self-delete / nonexistent delete | `DELETE /api/admin/users/1` allows self-delete, and `DELETE /api/admin/users/999999` succeeds instead of not found. |

Disposition: keep these as defect evidence. They are not "new errors" caused by
the suite wiring.

## SUT Validation / Permissiveness Gap

These failures are mostly single-field invalid-input cases where the API accepts
or loosely handles inputs that the test suite expects to reject with `400`.

| Endpoint group | Failed cards | Pattern |
| -------------- | ------------ | ------- |
| `POST /api/register` | 8 | Malformed, missing, duplicate, or non-string fields accepted or handled with looser status codes than the oracle expects. |
| `POST /api/login` | 3 | Bad request shapes produce `200`/`401` rather than the expected validation status. |
| `POST /api/forgot-password` | 3 | Non-string, malformed, or missing email cases return permissive/not-found behavior instead of `400`. |
| `PUT /api/users/me` manual cases | 4 | Malformed profile fields are accepted rather than rejected. |
| `POST /api/cart` | 6 | Invalid cart item fields and quantities are accepted. |
| `POST /api/checkout` | 4 | Missing, negative, or malformed checkout fields are accepted. |
| `POST /api/products` | 9 | Missing, zero, negative, or incorrectly typed product fields are accepted. |
| `POST /api/categories` | 4 | Empty, non-string, missing, or overlong category names are accepted. |
| `POST /api/admin/coupons` | 9 | Missing or malformed coupon fields are accepted. |

Disposition: valid evidence of weak validation, but do not explode these into
dozens of separate named defects unless the seminar needs that granularity. For
CI, either fix the SUT validation or move these cases into a defect-demo suite
instead of the green regression suite.

## Test-Design Leftovers

These are not clean SUT evidence. They should be fixed or removed before a final
green suite is claimed.

| Test case | Why it is a test-design issue |
| --------- | ----------------------------- |
| `GET /api/products` SQL-injection case | The title/oracle expects an injected search request and `400`, but the executed URL was plain `/api/products` with no query payload. |
| `GET /api/products/{id}` even-id price-type case | The case executed `/api/products/1`, not an even-id product, and its script failed with `ReferenceError: value is not defined`. |
| `PUT /api/products/{id}` negative-price case | The case executed `/api/products/abc`, so the failure is mixed with an invalid path parameter and does not cleanly prove negative-price validation. |

Disposition: fix these in the Apidog project library or exclude them from the
main CI suite. These are the clearest remaining cases where the test definition,
not the backend, is wrong.

## AI-Generated Oracle / Noise

The AI-generated sections are useful for review, but the raw generated cases are
not regression-ready as-is.

### `PUT /api/users/me`

The AI set includes one valuable security confirmation: the role-field
privilege escalation case expects `403` and receives `200`, corroborating the
SEC-06 class of defects. However, the same generated set also contains noisy or
contradictory oracles:

- It treats some role enum combinations as ordinary positive updates while also
  treating `role: "admin"` as a privilege-escalation attack.
- It expects `400` for many validation cases against a backend that is currently
  permissive.
- One "unsupported GET method" case actually executed a `PUT` request and got a
  server error, so its title/oracle does not match the executed request.
- A positive partial-update case expected `Profile updated.` with a period while
  the backend returns `Profile updated`.

### `GET /api/products/{id}`

The AI product-detail set contains several requests where the title and oracle
do not match the path Apidog actually executed:

- Some cases expected product ids such as `42` or `105` while the executed path
  was `/api/products/1`.
- Boundary, overflow, underflow, and malformed-id cases mix `/1`, `/999999`,
  and `/abc` with oracles that do not always line up with the concrete request.
- Several cases corroborate the known "missing product returns success-like
  behavior" issue, but the raw set should be reviewed before it is used as
  stable regression evidence.

Disposition: keep the AI section as M4 evidence of AI-assisted exploration.
Only promote individual AI cases into the manual/CI regression suite after
human review verifies that the request, title, and oracle all match.

## CI Implication

The current full Apidog suite is intentionally not a green regression baseline:
it mixes regression checks, defect-evidence cases, weak-validation probes, and
raw AI-generated oracle review. Because `.github/workflows/apidog-suite.yml`
currently requires all executed tests to pass, the workflow should remain red
until one of these decisions is made:

1. Fix the SUT so the defect/validation cases pass.
2. Split Apidog into a green CI suite and a separate defect-demo/AI-review
   suite.
3. Temporarily remove or quarantine the known-red cases from the CI-targeted
   suite while preserving them as seminar evidence.

Minimum cleanup before any green-suite claim: fix or remove the three
test-design leftovers above.
