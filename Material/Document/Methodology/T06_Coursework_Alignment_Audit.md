# T06 — Coursework Alignment Audit

## Overview

Checks the Pact implementation and the Apidog test cases against the four
techniques taught in class: Test Case fundamentals (S07), State Transition
Testing (S06.1), Use Case Testing (S06.2), and Domain Testing (S04).

Headline: the **Domain Testing** discipline is applied correctly and is the
strongest part of the work. **State Transition Testing is not applied at all**,
despite EShop having an obvious, already-documented state machine — that is the
single largest gap. The test-case _template_ also diverges from the one taught
in S07 in ways an examiner would notice immediately.

Findings are marked **[verified]** where checked against the actual documents,
and **[inferred]** where based on descriptions rather than direct reading of
source.

---

## Part 1 — The Pact implementation

### Where the procedure is correct

**Pact's interaction structure maps onto S07's test-case essentials better than
the Apidog cases do.** Each interaction has:

| Pact construct                                    | S07 essential                               |
| ------------------------------------------------- | ------------------------------------------- |
| `given('authenticated user has empty cart')`      | Pre-condition (S07 lists this inside Steps) |
| `uponReceiving('a request for the current cart')` | Description / Objective                     |
| `withRequest({...})`                              | Steps + Test data                           |
| `willRespondWith({...})`                          | Expected result                             |
| Verifier output                                   | Observed result                             |
| Pass/fail count                                   | Status                                      |

That is a near-complete match to S07's template — and it comes for free from the
framework rather than from deliberate design, which is worth saying honestly
rather than claiming as a design win.

**Provider states are genuine states in the S06.1 sense.**
`given('authenticated user has empty cart')` names a distinguishable situation
the system is in before the event. This is the right instinct, even though it
wasn't derived from a state diagram.

**Deliberate avoidance of SEC-06 in test setup is methodologically sound.**
State handlers mint a JWT directly rather than exploiting the
privilege-escalation defect to obtain one. Building test infrastructure on top
of a defect under test would make the tests unable to detect that defect being
fixed.

### Where it diverges from what was taught

**Every Pact interaction is a happy path.** All 10 cover success responses; none
contracts an error shape. **[inferred from the interaction list — worth
confirming against source]** In S04 terms, only the _valid_ equivalence classes
are covered and no invalid class is represented at all. The practical
consequence: the consumer's error-handling code is entirely uncontracted, so if
the backend changed the shape of its `{ error: "..." }` body, no contract would
fail.

**`uponReceiving` descriptions do not follow S07's title syntax.** The required
form is `Action + Function + Operating Condition`. Actual descriptions are noun
phrases — "a request for the current cart", "checkout request". Compare S07's
worked example, "Run annual report from empty spreadsheet." A conforming version
would be "Retrieve cart for authenticated user with empty cart."

**The two deliberate failures are, in S07 terms, inaccurate test cases — and
this needs care in the demo.** "Accurate" is the first criterion in
A.E.R.T.A.S.S. Both failing interactions have an Expected Result that was simply
wrong:

- Failure 1 (`order_id` vs `orderId`) is defensible in the demo, because chasing
  it surfaced a genuine secondary defect (EShop's camelCase inconsistency for
  created-row identifiers), now logged in `EShop_Defect.md`.
- Failure 2 (`{ cart: [] }` vs `[]`) surfaced **nothing**. Root-cause analysis
  confirmed server and OpenAPI spec both agree; only the contract was wrong. By
  S07's own criteria this is simply an inaccurate test case.

An examiner who knows S07 can reasonably say of Failure 2: _"that isn't a
finding, your test case is just wrong."_ The defensible framing is to present it
as a demonstration of **contract-authoring error as its own failure class** —
that a contract test can fail for reasons that have nothing to do with the
provider, and that distinguishing "provider drifted" from "my expectation was
wrong" is a real skill. Presented that way it teaches something; presented as a
defect discovery it will not survive scrutiny.

---

## Part 2 — The Apidog test cases

### Step-by-step: how these cases were created, and whether each step was done correctly

**Step 1 — Identify input and output variables (S04).** _Partially done._ For
each endpoint the request body fields were identified, but not exhaustively
partitioned. On `POST /api/cart` the inputs are `id`, `name`, `price`,
`quantity`, plus the auth token. Only `id` and `quantity` are ever varied.
`name` and `price` are never tested as missing, empty, or wrong-typed.
**[verified]** Output variables are barely treated as variables at all — S04
lists outputs (e.g. "Error message") as things that need their own equivalence
classes, and the error-body shape is only weakly asserted.

**Step 2 — Identify equivalence classes.** _Correctly done where attempted,
incompletely enumerated._ The valid/invalid split is real and consistently
applied. But S04's guidelines list a class type we systematically skip: the
_"must be" condition_ → one valid, one invalid class. `quantity` must be an
integer; there is no test for `quantity: "abc"` or `quantity: 1.5` anywhere in
the document. **[verified]**

**Step 3 — Select test cases.** _This is the strongest part of the work, and
both rules are followed correctly._

- Valid classes are combined into a single case, maximising efficiency — exactly
  S04's guidance. ✅
- Each invalid case violates **exactly one** class, so failures can be isolated.
  This is documented explicitly as "single-fault-mode discipline" throughout. ✅
  This directly implements S04's rule and should be called out in the User Guide
  as a deliberate application of the technique, not left implicit.

**Step 4 — Boundary Value Analysis.** _Started, not completed._ S04 specifies up
to 9 test points per partition: LB−1, LB, LB+1, … UB−1, UB, UB+1, plus
smallest/largest possible UI values. For `quantity` (valid ≥ 1) we test:

| BVA point                 | Value | Tested?                                     |
| ------------------------- | ----- | ------------------------------------------- |
| LB−1                      | 0     | ✅                                          |
| LB                        | 1     | ✅                                          |
| LB+1                      | 2     | ❌                                          |
| UB−1 / UB / UB+1          | —     | ❌ — **no upper bound is defined anywhere** |
| Largest possible UI value | —     | ❌                                          |

The missing upper bound is itself a finding worth logging: there is no
documented maximum quantity, so `quantity: 999999999` is presumably accepted.
S04's rationale — mis-specified inequalities are detectable _only_ at the
boundary — means an unbounded field can't be boundary-tested at all until
someone decides what the bound should be. That is a specification gap in EShop,
not just a test gap.

### Test case template — does not match S07

S07 gives an explicit template: **TC ID | Description | Steps (incl.
Pre-condition) | Expected Result | Observed Result | Status**.

`EShop_Apidog_TestCases.md` currently has: Case | Category | Body | Auth |
Assertions | Processors | Notes.

| S07 column                         | Present?                                                       |
| ---------------------------------- | -------------------------------------------------------------- |
| TC ID                              | ❌ **zero TC IDs in the document** [verified]                  |
| Description                        | ⚠️ present as "Case", but wrong syntax (see below)             |
| Steps incl. pre-condition          | ⚠️ implied by Body + Auth + Processors, never written as steps |
| Expected Result                    | ✅ the Assertions column                                       |
| Observed Result                    | ❌ **no column** [verified]                                    |
| Status (Pass/Fail/Blocked/Skipped) | ❌ **no column** [verified]                                    |

The three missing columns matter for the seminar specifically: without TC IDs
there is no way to reference a case in a defect report or a traceability matrix,
and without Observed/Status the document is a test _design_, not a test
_record_. Adding an ID column and two empty columns for Observed/Status is a
small, mechanical fix with a large presentation payoff.

**Case titles do not follow `Action + Function + Operating Condition`.** Current
names are bare conditions: "Quantity = 0", "Missing Authorization header",
"Nonexistent product id". **[verified]** Conforming versions: "Verify
add-to-cart rejects quantity of zero", "Verify add-to-cart rejects request with
missing Authorization header".

### A.E.R.T.A.S.S. — three criteria are violated

| Criterion         | Status                                                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**ccurate      | ⚠️ Several cases marked **(verify)** — honest, but unconfirmed expected results                                                                                                                                                                                                                          |
| **E**conomical    | ✅ Minimal, no redundant cases within a class                                                                                                                                                                                                                                                            |
| **R**epeatable    | ❌ **Violated.** The login-lockout case locks an account for 180 s; the admin self-delete case destroys the account it uses; the duplicate-email case depends on a prior registration. None survive a second consecutive run without manual reset.                                                       |
| **T**raceable     | ⚠️ Partial — defect cases cite `EShop_Defect.md` and FR-/SEC- numbers, but there is no systematic requirement reference per case                                                                                                                                                                         |
| **A**ppropriate   | ✅                                                                                                                                                                                                                                                                                                       |
| **S**elf-standing | ⚠️ **Partial violation.** Chained variables (`productId`, `orderId`, `createdProductId`, `createdCategoryId`) mean several cases only pass if another case ran first, in the right order                                                                                                                 |
| **S**elf-cleaning | ❌ **Violated across the board.** Cases create products, categories, coupons, cart items and orders, and **nothing is ever cleaned up.** The cart is never emptied — which compounds with the known defect that checkout doesn't clear it either. Test data accumulates in the SQLite file run over run. |

Self-cleaning is the most consequential of these, and it is fixable: add a
teardown case per endpoint group (delete what was created), or lean on the fact
that Pact's provider side already solved this correctly by running on `:memory:`
with a `resetDatabase()` per state — the Apidog side has no equivalent.

---

## Part 3 — Techniques taught but not applied

### State Transition Testing (S06.1) — the biggest gap

EShop has a textbook state machine, and it is already documented in
`EShop_Defect.md`: order status moves
`pending → confirmed → shipping → delivered`, with `canceled` reachable from
`pending` and `confirmed`, and both `delivered` and `canceled` intended as
terminal.

S06.1 requires three artefacts. **We have none of them:**

1. **A state transition diagram** — not drawn anywhere.
2. **State/transition coverage measurement** — never computed.
3. **A state transition table enumerating all combinations, valid and invalid**
   — not built.

Coverage as it stands: 5 states means a full state table has **25
combinations**. Across `PUT /api/admin/orders/{id}/status` and
`PUT /api/orders/{id}/cancel` we test roughly 6. **[verified — 4 transition rows
in the admin endpoint, plus the cancel cases]**

The valid transitions are: `pending→confirmed`, `pending→canceled`,
`confirmed→shipping`, `confirmed→canceled`, `shipping→delivered`. **0-switch
coverage** (S06.1: every single transition tested) requires all five. We
explicitly test `pending→confirmed` and, on the user side, cancellation from
`pending`. **`confirmed→shipping` and `shipping→delivered` are never tested as
standalone transitions** — they only occur incidentally inside the multi-step
Scenario B walk. That is not 0-switch coverage; it's one path through the
machine.

Why this matters beyond marks: S06.1's stated advantage of the state _table_ is
that it "catches implementation defects that allow invalid paths between
states." EShop has exactly such a defect — `canceled → delivered` is wrongly
permitted. We found it, but by inspection of the source, not by the technique
designed to find it. Building the table would very likely surface more: nothing
currently tests `delivered → pending`, `shipping → confirmed`, or
`canceled → confirmed`, and given this SUT's track record, at least one is
probably allowed.

**This is the highest-value work available right now.** A 5×5 state table with a
test case per cell is a well-bounded task, directly applies a technique the
course taught, and is likely to yield new defects — which is exactly what the
seminar's "depth of study" is graded on.

### Use Case Testing (S06.2) — applied implicitly, not by the technique

Scenario A (`Happy Path Purchase`: login → products → cart → checkout →
my-orders) is in substance a use-case **basic flow**. But none of S06.2's actual
method was used:

- No use case specification exists — no documented actor, goal, preconditions,
  postconditions.
- No **alternate flows** are identified. S06.2's login example derives 8
  scenarios (S1–S8) from a basic flow plus combinations of alternates; we have
  one path.
- Consequently no scenario derivation table.

For a "Complete a purchase" use case, obvious alternate flows go untested as
flows: cart is empty at checkout, coupon is invalid or expired, auth token
expires mid-flow, product is deleted between browse and checkout. Several of
these touch known defects — checkout doesn't clear the cart, so "check out twice
from one cart" is an alternate flow that would immediately expose it.

---

## Recommended actions, in priority order

1. **Build the order-status state transition table (S06.1).** 5×5, mark each
   cell valid/invalid, derive a test case per cell. Highest chance of new
   defects, directly applies a taught technique, well-bounded.
2. **Add TC ID, Observed Result, and Status columns** to
   `EShop_Apidog_TestCases.md`. Mechanical, quick, closes the most visible gap
   against S07's template.
3. **Rename cases to `Action + Function + Operating Condition`.** Also
   mechanical; makes every case self-describing per S07.
4. **Fix self-cleaning** — add teardown cases, or document explicitly why it
   isn't done and what the consequence is (accumulating test data in the SQLite
   file).
5. **Complete BVA on `quantity`** — add LB+1, and log the absent upper bound as
   a specification gap in `EShop_Defect.md`.
6. **Write one use case specification with alternate flows** for the purchase
   flow, and derive scenarios from it (S06.2). "Check out twice from one cart"
   alone is likely to demonstrate the cart-not-cleared defect as a flow rather
   than as a code reading.
7. **Consider one error-shape Pact contract** (e.g. `401` on login with wrong
   password) so the consumer's error handling is contracted at all.
