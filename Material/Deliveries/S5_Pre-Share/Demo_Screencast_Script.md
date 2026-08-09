# Demo Screencast — Shot List + Narration

**Target output:** `Material/Deliveries/S5_Pre-Share/Demo_Screencast.mp4`.
**Constraints (S1 rubric):** 5–8 minutes total, 1080p, ≤100 MB, English
narration, **no background music**, no pre-recorded fakes. **Recording
strategy:** capture clips **while doing Track A / B / F work**, not in a
dedicated recording session. Editing is a single sit-down at the end of Week 09.

## 1. Segment plan (target ~7:00 total)

| #   | Segment                                  | Duration | Captured while doing                |
| --- | ---------------------------------------- | -------- | ----------------------------------- |
| 1   | Cold-open + framing                      | 0:30     | Screen recording, straight-to-cam   |
| 2   | Apidog Happy Path scenario               | 1:30     | Track A execution (tomorrow)        |
| 3   | Four-scenario matrix on `POST /api/cart` | 1:00     | Track A execution (tomorrow)        |
| 4   | Apidog AI generation + diff              | 1:30     | Track B execution (Wednesday)       |
| 5   | Pact consumer test passing               | 0:30     | Existing state — record any time    |
| 6   | Pact provider verifier: 46/51 baseline   | 0:45     | Existing state — record any time    |
| 7   | Pact broken-provider demo                | 0:45     | Track F, deliberately-broken branch |
| 8   | Close                                    | 0:30     | Straight-to-cam                     |

Total: ~7:00. Buffer: 1:00 if a segment runs long; drop segment 7 first (per cut
order #5 in `Material/Document/Planning/W09_Action_Plan.md`).

## 2. Per-segment shot list + narration

### Segment 1 — Cold-open + framing (0:30)

- **On screen:** title card (from Slide 1 of the deck).
- **Narration:**

    > If you had three tools that all claim to test your API — a manual client,
    > an AI generator, and a contract framework — which one catches the bug
    > you're worried about tonight? This is a five-minute tour of what each one
    > does with the EShop backend, and where each one blinds you.

### Segment 2 — Apidog Happy Path scenario (1:30)

- **On screen:** Apidog → Test Scenarios → Happy Path Purchase → Run.
- **What to show:** the five steps ticking green in order — login → GET
  /api/products (productId captured) → POST /api/cart → POST /api/checkout
  (orderId captured) → GET /api/orders/my-orders. Cursor should hover on the
  Store Variable processors briefly.
- **Narration:**

    > A single click chains five requests. Login writes the JWT into an
    > environment variable, the product list picks up an id, checkout writes an
    > order id, and the last request verifies the order landed. This is
    > spec-based testing at its most productive: the API surface is the OpenAPI
    > file, and Apidog rides the spec top to bottom.

### Segment 3 — Four-scenario matrix on `POST /api/cart` (1:00)

- **On screen:** Test Cases tab on `POST /api/cart`, four cases visible, each
  color-coded by category.
- **What to show:** run the four cases sequentially. Zoom on the Boundary and
  Negative case results — both green, both tagged **(defect demo)**.
- **Narration:**

    > Four categories: Positive, Security, Boundary, Negative. The interesting
    > rows are the last two — quantity zero and a nonexistent product id both
    > return 200, because the SUT doesn't validate the body. These are
    > defect-demo cases: they assert on the observed outcome, so they pass today
    > but would fail the day the defect is fixed.

### Segment 4 — Apidog AI generation + diff (1:30)

- **On screen:** open `PUT /api/users/me`, click **Generate with AI**, wait,
  read the output.
- **What to show:** the AI's "Success" case includes `role: "admin"` in the
  body. Cursor should highlight the offending field. Then split-screen with our
  hand-authored **Self-promotion to admin** case categorized as Negative (defect
  demo).
- **Narration:**

    > The AI reads the OpenAPI schema. The schema still declares `role` as a
    > settable field — that's deliberate, so the SEC-06 defect stays documented.
    > The AI dutifully generates a "valid" case with `role admin`. It runs
    > green, because SEC-06 is real. Same body, opposite meaning. The AI is
    > validating a security hole as if it were a feature.

### Segment 5 — Pact consumer test passing (0:30)

- **On screen:** terminal in `frontend-web/`, `npm run test:pact`, green.
- **Narration:**

    > Pact reverses the direction. The frontend declares what shape it needs
    > from the backend, as an executable test. The consumer suite passes; a pact
    > file is generated.

### Segment 6 — Pact provider verifier: 46/51 baseline (0:45)

- **On screen:** terminal in `Sut/EShop/backend/`, `npm run pact:verify`, output
  showing 46/51 pass across `eshop-web`, `eshop-admin`, and `eshop-mobile`, with
  the five documented failures visible.
- **Narration:**

    > Forty-six of fifty-one interactions verified across three consumers. Five
    > failures are teaching material, not surprises: checkout still returns
    > `orderId` where the web contract expects `order_id`; a real checkout
    > stores a null `shipping_address`; the coupon percent formula returns the
    > wrong discount on both the web and mobile contracts; and the admin state
    > machine still accepts canceled to delivered.

### Segment 7 — Pact broken-provider demo (0:45)

- **On screen:** VS Code, edit `server.js` to rename `price → unitPrice` on
  `GET /api/products`. Save. Re-run provider verification and show the Products
  interactions failing under `eshop-web`, `eshop-admin`, and `eshop-mobile`.
  Revert. Re-run to return to the documented 46/51 baseline.
- **Narration:**

    > This is the segment neither Apidog nor Apidog AI would catch. `price` is a
    > real field that both frontend-web and frontend-admin depend on. One rename
    > in the provider, two broken consumer contracts, caught before either
    > consumer ships against it. Revert, verify back to the baseline.

### Segment 8 — Close (0:30)

- **On screen:** three-column matrix (from Slide 3 of the deck).
- **Narration:**

    > Three tools, three questions. Spec-based says the server matches the spec
    > today. AI-assisted says how much of that check runs itself.
    > Consumer-driven says the client still gets what it needs. Use each for
    > what it's for. Details in the User Guide.

## 3. Recording checklist (before hitting record)

- [ ] Backend running on `http://localhost:3000` with a seeded product (see
      `Material/Document/Apidog/W09_TrackA_Execution_Brief.md` §M1).
- [ ] Apidog `Local` environment active, `bearerToken` blank (each segment
      starts clean).
- [ ] Terminal font size ≥ 16pt, VS Code font size ≥ 16pt.
- [ ] Screen resolution 1920×1080. Cursor emphasis on.
- [ ] Notifications off (Slack, mail, Windows toasts).
- [ ] Any real JWTs blurred in post if visible for more than a frame.

## 4. Editing checklist

- [ ] Total runtime 5:00–8:00.
- [ ] Output ≤ 100 MB (use H.264, target 5 Mbps).
- [ ] English narration only, single track, no background music.
- [ ] Two-second breathers between segments; no jump cuts inside a segment.
- [ ] Final file at `Material/Deliveries/S5_Pre-Share/Demo_Screencast.mp4`.
- [ ] Frames used on Slides 7, 8, 9 exported to
      `Material/Evidence/screencast_frame_*.png` for the deck.

## 5. Fallback plan if a segment can't be recorded live

- Segment 4 (Apidog AI) depends on the hosted-LLM provider being reachable. If
  it flakes, record from a pre-generated screenshot with the same narration;
  note the substitution in `[AI-02]` §3.
- Segment 7 (broken provider) is the softest cut per
  `Material/Document/Planning/W09_Action_Plan.md` cut order #5. Drop it and walk
  through it live in S6 if editing runs long.
