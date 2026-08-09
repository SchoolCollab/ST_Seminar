# Seminar Slides — Outline

**Format target:** 14 slides (1 under the ≤15 hard cap, held as buffer). **Deck
file:** `Material/Deliveries/S5_Pre-Share/Seminar_Slides.pptx` — this markdown
is the source-of-truth outline to build the PowerPoint from. Every bullet here
becomes a slide bullet or a speaker note; no bullet is decorative. **Session
budget:** 45 min = \*\*10 min pitch + 10 min demo + 20 min activity

- 5 min Q&A\*\*. The pitch has to close inside 10 min including transitions.

## Structure at a glance

| Section     | Slides | Time   |
| ----------- | ------ | ------ |
| Pitch       | 1–6    | 10 min |
| Live demo   | 7–9    | 10 min |
| Activity    | 10–12  | 20 min |
| Close + Q&A | 13–14  | 5 min  |

---

## Section 1 — Pitch (slides 1–6, ~10 min)

### Slide 1 — Title + question

- **Title:** _Spec-based, AI-assisted, and consumer-driven — three angles on API
  testing._
- **Sub:** T06 seminar, W10. EShop SUT (Node/Express/SQLite, 31 operations, a
  documented defect catalogue).
- **Speaker note:** Open with the framing question — "if you had three tools
  that all claim to test your API, which one catches the bug you're worried
  about tonight?"
- **Timing:** 1 min.

### Slide 2 — The problem in one endpoint

- A single side-by-side visual on `PUT /api/users/me`:
    - Left: the OpenAPI schema declares `role` as a settable field.
    - Right: the SRS says only admins can change roles.
    - Bottom: the SUT accepts `role` from any authenticated body (SEC-06).
- **One-line takeaway:** _the spec is not the truth, and the code is not the
  spec._
- **Timing:** 1.5 min.

### Slide 3 — Three angles, one matrix

- Three columns: Apidog manual / Apidog AI / Pact.
- Four rows: _reads what?_ / _catches spec drift?_ / _catches SRS-vs-code gap?_
  / _catches silent backend changes?_
- Cells filled with a compact ✓ / ✗ / partial pattern. Don't read the cells
  aloud — point at the diagonals.
- **Timing:** 2 min.

### Slide 4 — Why _both_ spec-based and CDC

- Bullet 1: Apidog (manual + AI) is fast on the happy path, generous on
  auto-schema, blind to invariants and to silent field renames when the spec
  moves with the code.
- Bullet 2: Pact reads the client's actual assumptions, catches the field
  rename, requires plumbing and only covers what the client uses.
- Bullet 3: they answer different questions. This talk shows both, not
  either/or.
- **Timing:** 1.5 min.

### Slide 5 — M5 metrics (the numbers)

- The three-row × three-column table from `User_Guide.md` §4.3: setup time, run
  time, flake rate × Apidog manual / Apidog AI / Pact.
- **Speaker note:** flake N is 5 if achievable, 3 if not — announce which you
  got.
- **Timing:** 1.5 min.

### Slide 6 — M6 teaser (the finding)

- **46 of 51 Pact interactions verified across three consumers.** Five failed.
    - `POST /api/checkout` — contract asserted `order_id`; server returns
      `orderId`. Surfaced a real, separate defect: EShop is internally
      inconsistent about identifier casing.
    - Checkout evidence probe — a real frontend-shaped checkout stores
      `shipping_address` as null.
    - Web `POST /api/apply-coupon` — percent discount formula returns the wrong
      `discount_amount` and `final_amount`.
    - Admin STT-A-24 — `canceled → delivered` is accepted even though both
      states should be terminal.
    - Mobile `POST /api/apply-coupon` — independently corroborates the same
      percent-formula defect from another consumer.
- **Speaker note:** land on _"chasing the Pact failures taught us more than the
  passing cases."_
- **Timing:** 2 min.

---

## Section 2 — Live demo (slides 7–9, ~10 min)

### Slide 7 — Demo anchor: Happy Path scenario

- Screenshot: Apidog **Test Scenarios → Happy Path Purchase**, all steps green.
- Five bullets naming the steps: login → products → cart → checkout → my-orders.
  `productId` and `orderId` extracted via Store Variable processors.
- **Live action:** run the scenario in Apidog, watch the five green ticks land
  in order.
- **Timing:** 3 min.

### Slide 8 — Demo anchor: AI generation + diff

- Screenshot: Apidog **Generate with AI** on `PUT /api/users/me`.
- Two callouts:
    - AI-generated security case expects `403` for `role: "admin"` but the SUT
      returns `200` — live confirmation of SEC-06.
    - The same generated set also includes a role-enum positive case where
      `role: "admin"` passes as ordinary input — useful output and noisy output
      side by side.
- **Live action:** show the saved `PUT /api/users/me` report: 25 requests, 9
  passed, 16 failed; then the `GET /api/products/{id}` report: 22 requests, 3
  passed, 19 failed. Explain why red/green labels are not all equally
  meaningful without human oracle review.
- **Timing:** 4 min.

### Slide 9 — Demo anchor: Pact provider verifier

- Two runs, back to back:
    - Baseline run: `npm run pact:verify` — 46/51 pass, 5 documented failures
      visible (don't hide them, they're teaching material).
    - Broken run: rename `price → unitPrice` in `server.js` (a one-line edit
      prepared on a separate branch), re-run — Products interactions fail for
      `eshop-web`, `eshop-admin`, and `eshop-mobile`. Revert, re-run, baseline
      restored.
- **Speaker note:** land on _"`price` is shared by three real consumers. One
  backend rename breaks all three contracts before any consumer ships against it;
  spec-based checks would only stay honest if the spec did not move with the
  code."_
- **Timing:** 3 min.

---

## Section 3 — Activity (slides 10–12, ~20 min)

### Slide 10 — Activity setup + timing

- Teams of 2–3.
- Two hands-on parts + one wrap-up.
    - Part 1 (10 min): find one defect a hand-built case catches.
    - Part 2 (10 min): generate cases with AI, find one thing it gets wrong.
    - Part 3 (5 min, whole room): wrap-up discussion.
- Materials handed out: worksheet PDF, six-endpoint subset of the Apidog project
  export, the running SUT.

### Slide 11 — Part 1 prompt

- **Question on-screen:** _which endpoint + case row + defect + assertion?_
- Appendix A defect list visible at the bottom in small type so teams can
  reference it without flipping between screens.
- **Facilitator note:** move any team still on Part 1 at 12 min into Part 2.

### Slide 12 — Part 2 prompt

- **Question on-screen:** _which assertion did the AI produce that a human
  familiar with the SUT would not have written?_
- Four patterns to look for (from the worksheet): invented field,
  security-hole-as-feature, spec-conformant 404 that's actually 200,
  unauthenticated "Success" case.

---

## Section 4 — Close + Q&A (slides 13–14, ~5 min)

### Slide 13 — Wrap-up + the closing question

- Three take-aways as short bullets:
    - Apidog's schema check permits unlisted fields — SEC-01's `password` leak
      needs an explicit `$.password Exists` assertion.
    - AI generation reads the spec, not the SRS — the spec is where SEC-06 hides
      in plain sight.
    - Contract testing is the answer to "the spec moves with the code."
- **Closing question posed to the room:** _if the client stops sending `role`
  altogether, do you still need SEC-06 to be a bug on the server?_
- **Speaker note:** the intended answer is _"contract testing means yes — the
  server has to keep proving it accepts nothing it shouldn't, even when the spec
  still declares the field."_ Don't force the answer, let the room work it.

### Slide 14 — Q&A + references

- Deliverables layout: `Material/Deliveries/S5_Pre-Share/` (User Guide,
  screencast, worksheet, this deck).
- FM log: `Material/Document/SUT-Reference/EShop_Failure_Modes.md`.
- Repo path to the Apidog project export and the Pact tests.
- Contact + timing buffer.

---

## Build notes for the .pptx

- Use one slide master. Two title layouts: **Section separator** (for slides 1,
  7, 10, 13) and **Content** (everything else).
- Screenshots referenced on 7, 8, 9 come from Track F's recording session — pull
  frames from the screencast, don't re-capture separately.
- The tool-comparison matrix on Slide 3 and the metrics table on Slide 5 are the
  two data-dense slides. Everything else is at most 4 bullets.
- No animations. Transitions off. If the projector is 4:3, drop the tool matrix
  column widths by 10%.

## Speaker rehearsal targets

- Pitch section rehearses cleanly in ≤ 10 min from a cold start. If it doesn't,
  cut Slide 4 down to a single bullet — that's the softest slide in the pitch.
- Demo section (slides 7–9) is timed by the live action, not the slides. Confirm
  each live command runs in ≤ 3 min on the same machine you'll present from, not
  just on the dev laptop.
- Activity section (10–12) is 20 min of audience work — the presenter is
  timekeeping and facilitating, not talking through slides.
