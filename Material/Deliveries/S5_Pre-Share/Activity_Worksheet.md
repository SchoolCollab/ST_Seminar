# S6 Activity Worksheet — Spec-Based vs AI-Generated API Testing

**Total time:** 25 min hard (20 min hands-on + 5 min walkthrough). **Team
size:** 2–3 audience members per team. **Prerequisites:** the seminar-provided
Apidog project loaded, EShop backend running on `http://localhost:3000`, `Local`
environment active, valid `bearerToken` populated (either from the pre-share
screencast steps or by clicking Send once on `POST /api/login`).

## Learning objectives

By the end of the activity you should be able to answer:

1. What kind of defect **does** a hand-built spec-based test case catch that an
   AI-generated one **misses** — and why?
2. What kind of assertion **does** an AI generate that a human normally wouldn't
   — and is it useful or noise?
3. When would you reach for consumer-driven contract testing (Pact) instead of
   either approach above?

## Materials handed out

- The Apidog project export (`Material/Config/EShop_Apidog.apidog-project`) with
  hand-built cases on **six endpoints**: `POST /api/cart`, `GET /api/cart`,
  `PUT /api/users/me`, `GET /api/users/me`, `POST /api/checkout`,
  `GET /api/products/:id`.
- A defects hint card (Appendix A) — one line per SUT defect the collection
  covers, no case references.
- The running SUT (backend already started for you).

Do **not** consult the answer key at the end of this document during the
activity. It's separated by a horizontal rule so you can tear/scroll past it.

## Part 1 — Find a defect the hand-built cases catch (10 min)

1. Open the Test Cases tab on **any two** of the six endpoints listed above.
2. Run each hand-built case. Note which cases are tagged **(defect demo)** —
   these assert on the observed (defective) outcome, so they pass today but
   would fail if the defect is fixed.
3. Pick **one defect** whose case ran green. Answer, on the team's own sheet:
    - Which endpoint and which case row.
    - What the case asserts vs what the spec or the SRS says it should return.
    - Which defect from Appendix A this maps to.

**Success criterion.** Your team can name one defect and quote the exact
assertion that pins it (e.g., `Body:$.password Exists`, or `Status=200` on a
missing-product lookup).

## Part 2 — Generate cases with Apidog AI, spot one thing it gets wrong (10 min)

1. Pick **one** of the six endpoints. Open the Test Cases tab → **Generate with
   AI**.
2. Wait for the generation to finish (~30 seconds against the hosted LLM).
3. Read the generated cases without running them first. Look for at least one
   of:
    - An assertion on a field the SUT never returns (invented field).
    - A "valid" case that includes a field that shouldn't be client-settable
      (e.g., `role` on `PUT /api/users/me` — SEC-06 as a feature).
    - A 404 expectation on a case that actually returns 200 (e.g.,
      `GET /api/products/:id` for a missing id — server returns `{}` + 200).
    - An overconfident "Success" case where auth is missing or the body is
      malformed.
4. Run the case you flagged. Answer, on the team's own sheet:
    - Which endpoint you picked.
    - The specific AI-generated assertion that's wrong.
    - Whether the case ran red, ran green (accepting the defect), or was
      logically wrong even though it happened to pass.

**Success criterion.** Your team can point at one AI-generated assertion and
explain, in one sentence, why a human familiar with the SUT would not have
written that assertion.

## Part 3 — Wrap-up discussion (5 min, whole room)

Volunteers share one finding from Part 1 and one from Part 2. The speaker closes
on the connecting question:

> When the AI can generate a "valid" case that includes `role` as if it were a
> normal profile field — because the spec still declares it — what kind of test
> would have caught that on the backend side, not by inspecting the generated
> case?

_(Intended answer: a consumer-driven contract test — Pact — where the frontend
declares the request shape it actually uses, and `role` never appears in the
request body it sends. Contract drift on the backend would fail the contract
even if the spec quietly kept `role`.)_

## Appendix A — Defects hint card

- **SEC-01:** `GET /api/users/me` returns the whole users row including the
  plaintext `password` field.
- **SEC-06:** `PUT /api/users/me` accepts `role` in the body and updates it in
  the DB, with no admin check.
- **FR-07:** `POST /api/cart` performs no validation and does not merge
  duplicate product IDs.
- **FR-08:** `POST /api/checkout` trusts the client's `total_amount` and does
  not clear the cart after checkout.
- **`{}`-on-404 quirk:** `GET /api/products/:id` returns `200` with an empty
  object body when the product doesn't exist (not `404`).
- **Even-id price coercion:** `GET /api/products/:id` returns `price` as a
  **string** when the id is even, as an **integer** when the id is odd.
- **camelCase `orderId`:** `POST /api/checkout` returns the identifier as
  `orderId` while the rest of the API uses snake_case for identifiers.

---

# ANSWER KEY (facilitator use — do not distribute during the activity)

## Part 1 — canonical findings

Any of the following counts as a full-credit answer. The team only needs to name
one; the multi-line answers below are for facilitator reference.

**`GET /api/users/me` → SEC-01.**

- Case: **"Password field leaked"** (Security, defect demo).
- Assertion: `Body:$.password Exists`.
- Why it catches the defect: the SRS/spec never declares a `password` field on
  the response schema — but the SUT dumps the whole users row including the
  plaintext password column. Apidog's response-validation toggle **does not**
  catch this by itself, because Apidog's schema check permits unlisted fields.
  The explicit `$.password Exists` assertion is what pins the leak.

**`PUT /api/users/me` → SEC-06.**

- Case: **"Self-promotion to admin"** (Negative, defect demo).
- Assertion: `Status=200` after sending `{ "role": "admin", ... }` with a
  regular user's `bearerToken`.
- Why it catches the defect: the SRS says only admins can change roles. The SUT
  accepts the field from any authenticated body. Follow-up verification:
  `GET /api/users/me` on the same user returns `role: "admin"`.

**`POST /api/cart` → FR-07.**

- Case: **"Quantity = 0 accepted"** or **"Nonexistent product id accepted"**
  (Boundary / Negative, both defect demo).
- Assertion: `Status=200`; `Body:$.message Equals "Added to cart"`.
- Why it catches the defect: the SUT does zero validation. Any valid JWT
  produces a 200 regardless of body shape.

**`POST /api/checkout` → FR-08 (trust-client-total).**

- Case: **"Client-controlled total accepted"** (Negative, defect demo).
- Assertion: `Status=200`; `Body:$.orderId Exists` with `total_amount: 1`.
- Why it catches the defect: the SUT stores `total_amount` verbatim without
  recomputing from the cart.

**`GET /api/products/:id` → `{}`-on-404.**

- Case: **"Missing product returns `{}`+200"** (Negative, defect demo).
- Assertion: `Status=200`; `Body:$ Equals {}`.
- Why it catches the defect: the SRS implies `404`; the SUT returns `200` with
  an empty object body, so a spec-conformant test asserting `Status=404` would
  incorrectly fail. Our defect-demo case pins the observed outcome so the case
  starts failing on the day the defect is fixed.

## Part 2 — canonical AI-generation failure modes

Two specific candidates are pre-flagged; either counts.

**Candidate A — `PUT /api/users/me` valid case includes `role`.** The AI reads
the OpenAPI schema, which still declares `role` as a settable field (kept in the
spec deliberately to document SEC-06). The AI dutifully generates a "valid" case
with `role: "admin"` in the body. That case runs green against the SUT — because
the defect is real — but the case is logically wrong: it's asserting the
security hole as if it were a feature. No human familiar with the SRS would
write this case.

**Candidate B — `GET /api/products/:id` for a missing id.** The AI's most likely
generated assertion is `Status=404` — the spec-implied behavior. The SUT
actually returns `Status=200` with `{}`. The case runs **red** for the wrong
reason: the assertion is right by the spec but the SUT is quirky. A human
writing the case with `EShop_Defect.md` in view would either write the
defect-demo case (`Status=200; Body:$ Equals {}`) or add a comment
distinguishing spec-conformance from SUT-observed behavior.

**Third possible finding — `POST /api/cart` "Success" case ignores auth.** Some
AI generations produce a "Success" case with no `Authorization` header. That
case returns `401`, marked red. Not wrong per se — but a human would either put
it in the **Security** category, not **Positive**, or fix the case to include
auth.

## Timing notes for the facilitator

- Give Part 1 a 10-min soft cap. If any team is still on Part 1 at 12 min, move
  them to Part 2 anyway — Part 2's AI generation runs while the team finishes
  analyzing Part 1.
- Part 2's LLM call is the only step with network dependency. If the hosted LLM
  is slow, use the pre-recorded generation from the screencast as a backup and
  shift the task to "read this AI output" rather than "wait for it."
- Part 3 should finish inside 5 min, hard. Cut off after two volunteer shares
  and go straight to the closing question.
