# EShop — Order Status State Transition Testing (S06.1)

## Overview

Applies State Transition Testing to EShop's order status field, following the
four-step S06.1 approach: describe the SUT as a state diagram, build the state
table (all combinations, not just valid ones), derive a test case per cell, then
measure coverage. This closes the single largest gap identified in
`T06_Coursework_Alignment_Audit.md` — a documented state machine that had never
actually been tested with the technique built for it.

**Assertion principle.** Every case below asserts the state machine's _intended_
behavior, never a prediction of what a known bug currently does. Concretely:
`STT-A-24` (`canceled→delivered`) and `STT-B-03` (`shipping`-order cancel) are
both confirmed or high-confidence-predicted defects — but their assertions are
`400` (the correct, terminal-state-respecting behavior), not `200` (what the bug
actually returns). This means both cases are **expected to currently fail**, and
that failure is the defect's live evidence. If either case ever unexpectedly
passes, that means the defect was fixed — a result worth noticing, not a broken
test to "fix" back to asserting the bug.

**Read the "Be careful about this" section before running anything** — several
things here are genuinely different from a textbook single-mechanism state
machine, and most cells in both tables below are hypotheses inferred from the
admin transition logic already documented in `EShop_Defect.md`, not freshly
re-verified. Building the table is step 2 of 4; actually running the cells is
what turns hypotheses into results.

## States and events

**States** (5): `pending`, `confirmed`, `shipping`, `delivered`, `canceled`.

**Two distinct transition mechanisms (this is the complication S06.1's textbook
model doesn't anticipate):**

| Endpoint                            | Who         | Target state                             | Behaviour                                                                                          |
| ----------------------------------- | ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PUT /api/admin/orders/{id}/status` | Admin       | Any of the 5, chosen in the request body | General-purpose transition, evaluated against an explicit allow-list in the handler                |
| `PUT /api/orders/{id}/cancel`       | Order owner | Always `canceled`                        | Special-purpose: only ever moves _toward_ `canceled`, guarded by checking the _current_ state only |

These aren't the same state machine wearing two interfaces — they enforce
different rules. The cancel endpoint's guard
(`if (status === 'delivered' || status === 'canceled') reject`) is looser than
the admin endpoint's allow-list, and that looseness is exactly where FR-10's
known defect lives (see Table B).

## State diagram (as intended by the SRS)

```
pending ──confirm──> confirmed ──ship──> shipping ──deliver──> delivered
   │                     │
   └──cancel──> canceled <──cancel──┘

delivered, canceled = intended terminal states (no outgoing transitions)
```

The known defect is that `canceled` is not actually terminal via the admin
endpoint (Table A), and `shipping` is not protected from user-cancellation via
the cancel endpoint (Table B) — both violate the diagram above.

---

## Table A — `PUT /api/admin/orders/{id}/status` (5 × 5 = 25 combinations)

Rows = current state, columns = requested target state. **Confirmed** = actually
executed in this project so far. **Hypothesis** = inferred from the admin
handler's documented allow-list (`EShop_Defect.md`), not yet independently
re-run — treat these as the thing this table exists to verify, not as settled
fact.

| From ↓ / To → | pending                           | confirmed                         | shipping                          | delivered                                                                                      | canceled                          |
| ------------- | --------------------------------- | --------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| **pending**   | _(self)_ Hypothesis: invalid, 400 | ✅ **Confirmed valid**, 200       | Hypothesis: invalid, 400          | **Confirmed invalid**, 400 (tested as the "illegal transition" case)                           | Hypothesis: valid, 200            |
| **confirmed** | Hypothesis: invalid, 400          | _(self)_ Hypothesis: invalid, 400 | Hypothesis: valid, 200            | Hypothesis: invalid, 400                                                                       | Hypothesis: valid, 200            |
| **shipping**  | Hypothesis: invalid, 400          | Hypothesis: invalid, 400          | _(self)_ Hypothesis: invalid, 400 | Hypothesis: valid, 200                                                                         | Hypothesis: invalid, 400          |
| **delivered** | Hypothesis: invalid, 400          | Hypothesis: invalid, 400          | Hypothesis: invalid, 400          | _(self)_ Hypothesis: invalid, 400                                                              | Hypothesis: invalid, 400          |
| **canceled**  | Hypothesis: invalid, 400          | Hypothesis: invalid, 400          | Hypothesis: invalid, 400          | ⚠️ **Confirmed BUG — actually valid**, 200 (should be 400; `canceled` is meant to be terminal) | _(self)_ Hypothesis: invalid, 400 |

**3 of 25 cells confirmed by prior work. 22 are untested hypotheses.** The five
`delivered`-row cells and the `canceled`-row cells other than `→delivered` are
the least examined and, given this SUT's track record, the most likely to hide
something — nothing has ever probed whether `delivered` is _actually_ terminal,
only assumed it from the SRS.

## Table B — `PUT /api/orders/{id}/cancel` (5 starting states, single target: `canceled`)

| From state  | Valid?                                                                                                                                               | Confirmed or hypothesis                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pending`   | Valid, 200                                                                                                                                           | ✅ Confirmed (existing "Success (pending)" case)                                                              |
| `confirmed` | Valid, 200                                                                                                                                           | Hypothesis — not yet explicitly tested from this starting state                                               |
| `shipping`  | ⚠️ **Valid, 200 — this is FR-10's known defect.** Should be rejected; the guard only checks for `delivered`/`canceled`, so `shipping` slips through. | Hypothesis, but strongly supported by the documented guard logic — high-confidence prediction, not yet re-run |
| `delivered` | Invalid, 400                                                                                                                                         | ✅ Confirmed (existing "already delivered/canceled" case)                                                     |
| `canceled`  | Invalid, 400                                                                                                                                         | ✅ Confirmed (existing "already delivered/canceled" case, same guard covers both)                             |

---

## Test cases — S07-compliant template

Using S07's actual template this time (TC ID / Description / Steps / Expected
Result / Observed Result / Status), correcting the format gap flagged in the
coursework audit. Descriptions follow `Action + Function + Operating Condition`.
**Observed Result and Status are intentionally blank** — fill them in as you run
each case in Apidog; a table with those columns pre-filled would just be
restating Expected Result.

### Table A test cases (admin status update)

| TC ID    | Description                                                                | Pre-condition (starting state) | Steps                                          | Expected Result                                             | Observed Result | Status          |
| -------- | -------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------- | ----------------------------------------------------------- | --------------- | --------------- |
| STT-A-01 | Verify status update accepts pending→confirmed                             | Order in `pending`             | `PUT .../status` with `{"status":"confirmed"}` | 200                                                         |                 |                 |
| STT-A-02 | Verify status update rejects pending→pending (self-transition)             | Order in `pending`             | Same endpoint, `{"status":"pending"}`          | 400 (hypothesis)                                            |                 |                 |
| STT-A-03 | Verify status update rejects pending→shipping (skips confirmed)            | Order in `pending`             | `{"status":"shipping"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-04 | Verify status update rejects pending→delivered                             | Order in `pending`             | `{"status":"delivered"}`                       | 400                                                         |                 |                 |
| STT-A-05 | Verify status update accepts pending→canceled                              | Order in `pending`             | `{"status":"canceled"}`                        | 200 (hypothesis)                                            |                 |                 |
| STT-A-06 | Verify status update rejects confirmed→pending (backward)                  | Order in `confirmed`           | `{"status":"pending"}`                         | 400 (hypothesis)                                            |                 |                 |
| STT-A-07 | Verify status update rejects confirmed→confirmed (self-transition)         | Order in `confirmed`           | `{"status":"confirmed"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-08 | Verify status update accepts confirmed→shipping                            | Order in `confirmed`           | `{"status":"shipping"}`                        | 200 (hypothesis)                                            |                 |                 |
| STT-A-09 | Verify status update rejects confirmed→delivered (skips shipping)          | Order in `confirmed`           | `{"status":"delivered"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-10 | Verify status update accepts confirmed→canceled                            | Order in `confirmed`           | `{"status":"canceled"}`                        | 200 (hypothesis)                                            |                 |                 |
| STT-A-11 | Verify status update rejects shipping→pending (backward)                   | Order in `shipping`            | `{"status":"pending"}`                         | 400 (hypothesis)                                            |                 |                 |
| STT-A-12 | Verify status update rejects shipping→confirmed (backward)                 | Order in `shipping`            | `{"status":"confirmed"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-13 | Verify status update rejects shipping→shipping (self-transition)           | Order in `shipping`            | `{"status":"shipping"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-14 | Verify status update accepts shipping→delivered                            | Order in `shipping`            | `{"status":"delivered"}`                       | 200 (hypothesis)                                            |                 |                 |
| STT-A-15 | Verify status update rejects shipping→canceled                             | Order in `shipping`            | `{"status":"canceled"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-16 | Verify status update rejects delivered→pending (terminal state)            | Order in `delivered`           | `{"status":"pending"}`                         | 400 (hypothesis — **verify `delivered` is truly terminal**) |                 |                 |
| STT-A-17 | Verify status update rejects delivered→confirmed (terminal state)          | Order in `delivered`           | `{"status":"confirmed"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-18 | Verify status update rejects delivered→shipping (terminal state)           | Order in `delivered`           | `{"status":"shipping"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-19 | Verify status update rejects delivered→delivered (self-transition)         | Order in `delivered`           | `{"status":"delivered"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-20 | Verify status update rejects delivered→canceled (terminal state)           | Order in `delivered`           | `{"status":"canceled"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-21 | Verify status update rejects canceled→pending (terminal state)             | Order in `canceled`            | `{"status":"pending"}`                         | 400 (hypothesis)                                            |                 |                 |
| STT-A-22 | Verify status update rejects canceled→confirmed (terminal state)           | Order in `canceled`            | `{"status":"confirmed"}`                       | 400 (hypothesis)                                            |                 |                 |
| STT-A-23 | Verify status update rejects canceled→shipping (terminal state)            | Order in `canceled`            | `{"status":"shipping"}`                        | 400 (hypothesis)                                            |                 |                 |
| STT-A-24 | Verify status update rejects canceled→delivered (both are terminal states) | Order in `canceled`            | `{"status":"delivered"}`                       | **400** [EXPECTED TO FAIL — tracks a confirmed defect]      | 200             | Fail (expected) |
| STT-A-25 | Verify status update rejects canceled→canceled (self-transition)           | Order in `canceled`            | `{"status":"canceled"}`                        | 400 (hypothesis)                                            |                 |                 |

**Pact corroboration for STT-A-24.** Iteration 2's `eshop-admin` Pact provider
verification independently exercised this same transition through
`PUT /api/admin/orders/1/status` with `{"status":"delivered"}` from a seeded
`canceled` order. The contract asserted the intended `400`/error response, while
the live backend returned `200`; this was the single `eshop-admin` verification
failure in the confirmed 15/16 baseline. That gives STT-A-24 both source-level
evidence and live contract-verification evidence.

### Table B test cases (user cancel)

| TC ID    | Description                                               | Pre-condition        | Steps            | Expected Result                           | Observed Result | Status |
| -------- | --------------------------------------------------------- | -------------------- | ---------------- | ----------------------------------------- | --------------- | ------ |
| STT-B-01 | Verify cancel accepts request from pending order          | Order in `pending`   | `PUT .../cancel` | 200                                       |                 |        |
| STT-B-02 | Verify cancel accepts request from confirmed order        | Order in `confirmed` | `PUT .../cancel` | 200 (hypothesis)                          |                 |        |
| STT-B-03 | Verify cancel rejects request from a shipping order       | Order in `shipping`  | `PUT .../cancel` | **400** [EXPECTED TO FAIL — tracks FR-10] |                 |        |
| STT-B-04 | Verify cancel rejects request from delivered order        | Order in `delivered` | `PUT .../cancel` | 400                                       |                 |        |
| STT-B-05 | Verify cancel rejects request from already-canceled order | Order in `canceled`  | `PUT .../cancel` | 400                                       |                 |        |

---

## Coverage measurement (S06.1)

**All States Coverage:** 5/5 states appear as a starting state in at least one
case across both tables — 100%.

**All Transitions Coverage (0-switch):** the SRS's _intended_ diagram has 5
valid transitions (`pending→confirmed`, `pending→canceled`,
`confirmed→shipping`, `confirmed→canceled`, `shipping→delivered`). All 5 are
covered by a case (STT-A-01, STT-A-05, STT-A-08, STT-A-10, STT-A-14).
**Intended-transition coverage: 5/5 = 100%.**

**Full state table coverage:** 30 of 30 possible current-state × target-state
combinations across both endpoints now have a designed case (25 in Table A, 5 in
Table B) — **100% of the table**, versus 3 confirmed cells before this document
existed. What changed is _design_ coverage, not _execution_ coverage — 27 of
those 30 cases have never actually been run.

**1-switch coverage:** not attempted. A 1-switch case would walk two consecutive
real transitions in one test (e.g. `pending→confirmed→shipping` as a single case
checking both steps succeed in sequence) rather than treating each as
independent. None of the cases above do this; Scenario B in
`EShop_Apidog_Steps.md` does walk a real multi-step sequence but wasn't designed
as 1-switch coverage and doesn't systematically cover pairs.

---

## Be careful about this

**Most of this table is unexecuted.** 27 of 30 designed cases are hypotheses,
not results. Do not describe this document to your instructor as "test cases
covering the state machine" without the qualifier that only 3 have actually been
run — the honest framing is "full design coverage, partial execution coverage,"
and that distinction is itself something S06.1 cares about (design vs.
execution).

**Two transition mechanisms, not one.** If asked to explain this technique's
application, be ready to say explicitly that EShop has two endpoints capable of
changing order state with two different rule sets, and that you built two tables
rather than forcing a single 5×5 table to represent both. Collapsing them into
one table would hide the real bug (Table B's `shipping` leak) inside a structure
that implies Table A's rules apply everywhere.

**Setting up the pre-condition state is non-trivial for the later rows, and
there's a real cost trade-off.** To test `STT-A-16` through `STT-A-25` (starting
from `delivered` or `canceled`), you first need an order that has _already_
legitimately walked `pending→confirmed→shipping→delivered`, or been canceled —
meaning each of those test cases needs 2–4 real setup transitions before the
actual test transition even happens. Two ways to handle this:

- **Walk it for real each time** (create order → confirm → ship → deliver →
  _then_ run the actual test). Slower, but exercises real code paths as setup,
  which has its own testing value.
- **Borrow Pact's trick.** `stateHandlers.js` on the Pact side sets up
  preconditions by writing directly to the database rather than walking
  transitions. If Apidog has an equivalent (a pre-processor script that seeds an
  order row directly, or a `/_pact/setup`-style test-only route), it would make
  the 27 untested cases far faster to execute — worth investigating before
  manually clicking through 25 setup sequences.

**No self-cleaning exists for any of this**, per the coursework audit's finding
— every order created during this testing round stays in the database afterward.
Given Table A alone needs roughly 20+ distinct orders (one per non-trivial
precondition state, since a single order can't be reused once it's moved past
the state you need), this will meaningfully grow the SQLite file. Worth deciding
now whether that's acceptable or whether a teardown pass belongs in the same
session.

**Only STT-A-24 (`canceled→delivered`) is a confirmed defect.** STT-B-03
(`shipping` cancel) is a _high-confidence prediction_ based on the documented
guard logic, not yet independently re-run — say "predicted" or "expected," not
"confirmed," until it's actually executed. Every other "Hypothesis: invalid,
400" cell could just as easily turn out to be another undiscovered bug if the
admin handler's allow-list has a gap nobody's read closely enough to notice.
That possibility is the entire reason this table exists — don't let the
hypotheses quietly become treated as known-good just because they're the
"expected" default.

**Self-transitions (`pending→pending`, etc.) are a genuine unknown**, not just a
formality. Nothing in prior work — including the original source reading —
explicitly confirmed how the admin handler treats a same-state "transition." It
may correctly reject with 400 (falls through a default `else`), or it may accept
it as a no-op 200, or it could behave inconsistently across different states.
All five self-transition cells are pure hypothesis with no prior grounding at
all.

---

## Execution plan — Table A as three Apidog Test Scenarios

Table B needs no special setup (each of its 5 cells is a single request on a
fresh or appropriately-aged order). Table A is where the setup cost lives, and
the plan below reduces 25 test-case executions down to **3 orders** by reusing
each valid transition as the setup step for the next test, and only branching to
a new order where a row has two valid destinations that can't both be reached
from the same object.

**Correction from the earlier estimate:** two orders isn't enough. Both
`pending` and `confirmed` have two valid outgoing transitions each
(`pending`→`confirmed` _or_ `canceled`; `confirmed`→`shipping` _or_ `canceled`),
and firing one forecloses the other on that same order. Three orders are needed:
one long forward walk, one that branches to `canceled` from `pending`, and one
that branches to `canceled` from `confirmed`.

**Before running any of this as a one-click Apidog Test Scenario:** it's
unconfirmed whether a failed assertion in an Apidog scenario halts the remaining
steps or lets them run anyway (this is one of the open candidates already
flagged in `EShop_Failure_Modes.md`). Given that a wrongly-succeeding "invalid"
transition here would silently corrupt every downstream step's precondition,
**run each scenario step-by-step manually the first time**, checking the actual
status after every request before sending the next one. Only convert it into an
automated one-click scenario once a full manual pass confirms every step behaves
as hypothesized.

### Scenario 1 — Forward chain walk (18 cells: `pending`→`confirmed`→`shipping`→`delivered`)

One order, created once, walked all the way to `delivered`. Every "invalid" step
in a row is fired before that row's chain-continuing valid step, so a wrong
assertion doesn't cost you the object.

| Step | Request                                                 | Expected               | Maps to  | Note                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------- | ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Login (standing hook)                                   | 200, `bearerToken` set | —        | Reuses Step 4's hook                                                                                                                                                                                      |
| 2    | `POST /api/checkout`, valid body                        | 200                    | (setup)  | Post-Processor: `orderId ← $.orderId`. Order is now `pending`.                                                                                                                                            |
| 3    | `PUT /orders/{{orderId}}/status` `{"status":"pending"}` | 400                    | STT-A-02 | Self-transition                                                                                                                                                                                           |
| 4    | Same, `{"status":"shipping"}`                           | 400                    | STT-A-03 | Skip-ahead                                                                                                                                                                                                |
| 5    | Same, `{"status":"delivered"}`                          | 400                    | STT-A-04 | Skip-ahead                                                                                                                                                                                                |
| 6    | Same, `{"status":"confirmed"}`                          | **200 — CHECKPOINT**   | STT-A-01 | If not 200, stop the scenario here; order never reached `confirmed` and nothing below is valid to run                                                                                                     |
| 7    | Same, `{"status":"pending"}`                            | 400                    | STT-A-06 | Backward                                                                                                                                                                                                  |
| 8    | Same, `{"status":"confirmed"}`                          | 400                    | STT-A-07 | Self-transition                                                                                                                                                                                           |
| 9    | Same, `{"status":"delivered"}`                          | 400                    | STT-A-09 | Skip-ahead                                                                                                                                                                                                |
| 10   | Same, `{"status":"shipping"}`                           | **200 — CHECKPOINT**   | STT-A-08 | If not 200, stop here                                                                                                                                                                                     |
| 11   | Same, `{"status":"pending"}`                            | 400                    | STT-A-11 | Backward                                                                                                                                                                                                  |
| 12   | Same, `{"status":"confirmed"}`                          | 400                    | STT-A-12 | Backward                                                                                                                                                                                                  |
| 13   | Same, `{"status":"shipping"}`                           | 400                    | STT-A-13 | Self-transition                                                                                                                                                                                           |
| 14   | Same, `{"status":"canceled"}`                           | 400                    | STT-A-15 | Different endpoint from Table B's `shipping`-cancel bug — this one goes through the admin endpoint, not the cancel endpoint; a different result here from Table B's STT-B-03 would itself be worth noting |
| 15   | Same, `{"status":"delivered"}`                          | **200 — CHECKPOINT**   | STT-A-14 | Order is now `delivered`, the intended terminal state                                                                                                                                                     |
| 16   | Same, `{"status":"pending"}`                            | 400                    | STT-A-16 | Terminal-state check                                                                                                                                                                                      |
| 17   | Same, `{"status":"confirmed"}`                          | 400                    | STT-A-17 | Terminal-state check                                                                                                                                                                                      |
| 18   | Same, `{"status":"shipping"}`                           | 400                    | STT-A-18 | Terminal-state check                                                                                                                                                                                      |
| 19   | Same, `{"status":"delivered"}`                          | 400                    | STT-A-19 | Self-transition                                                                                                                                                                                           |
| 20   | Same, `{"status":"canceled"}`                           | 400                    | STT-A-20 | Terminal-state check — this is the cell most likely to surprise you, since `delivered→canceled` has never been examined at all before this document                                                       |

### Scenario 2 — Cancel branch from `pending` (6 cells)

Fresh order. Tests the `canceled` row (Table A's least-examined rows) plus the
`pending→canceled` cell that Scenario 1 deliberately skipped.

| Step | Request                                                  | Expected                                      | Maps to  | Note                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | -------------------------------------------------------- | --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `POST /api/checkout`, valid body                         | 200                                           | (setup)  | New `orderId`, order is `pending`                                                                                                                                                                                                                                                                                                                                                                                    |
| 2    | `PUT /orders/{{orderId}}/status` `{"status":"canceled"}` | **200 — CHECKPOINT**                          | STT-A-05 | If not 200, stop; nothing below applies                                                                                                                                                                                                                                                                                                                                                                              |
| 3    | Same, `{"status":"pending"}`                             | 400                                           | STT-A-21 |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 4    | Same, `{"status":"confirmed"}`                           | 400                                           | STT-A-22 |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5    | Same, `{"status":"shipping"}`                            | 400                                           | STT-A-23 |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6    | Same, `{"status":"delivered"}`                           | **400** [EXPECTED TO FAIL — confirmed defect] | STT-A-24 | The only cell in the whole table with a confirmed prior result: the server currently returns 200 here, so this case is expected to fail every time it's run, and that failure is the defect's evidence. If it ever returns 400 instead, the bug may have been fixed by an unrelated change — worth flagging either way, since a case flipping from fail to pass should always be noticed, not just quietly accepted. |
| 7    | Same, `{"status":"canceled"}`                            | 400                                           | STT-A-25 | Self-transition; run last since step 6 already moved the order to `delivered`                                                                                                                                                                                                                                                                                                                                        |

### Scenario 3 — Cancel branch from `confirmed` (1 cell, plus setup)

Fresh order. Exists only to reach the one remaining untested cell —
`confirmed→canceled` can't be tested on Scenario 1's order, since that order's
`confirmed` state was already spent moving forward to `shipping`.

| Step | Request                                                   | Expected                                     | Maps to  | Note                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------- | -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `POST /api/checkout`, valid body                          | 200                                          | (setup)  | New `orderId`                                                                                                                                                                                            |
| 2    | `PUT /orders/{{orderId}}/status` `{"status":"confirmed"}` | 200 — precondition guard, not a new STT case | (setup)  | This repeats STT-A-01's transition on a new object; already-established behavior, but still worth asserting 200 here as a sanity check before the real test — if this fails, cell 10 below means nothing |
| 3    | Same, `{"status":"canceled"}`                             | 200 (hypothesis)                             | STT-A-10 | The actual cell this scenario exists for                                                                                                                                                                 |

### Coverage after all three scenarios

18 + 6 + 1 = 25 cells — Table A in full, using 3 orders total instead of up
to 25. Table B's 5 cells still need no chaining, since each starts from an
independently-created order at the right pre-existing state (or reuses states
already produced as a side effect of Scenarios 1 and 2, if you want to save even
those 5 creations — e.g. Table B's `shipping`-precondition case could reuse a
_fourth_ order created solely for that purpose, since Scenario 1's order is
consumed reaching `delivered` and can't be reused for a Table B test from
`shipping`).
