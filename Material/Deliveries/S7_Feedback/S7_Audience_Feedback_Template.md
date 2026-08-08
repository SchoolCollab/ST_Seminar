# S7 Audience Feedback Capture Template

**Purpose.** Structured capture of audience reactions during and after S6, so
the S8 reflection has real evidence instead of memory. **Fill during S6:** the
facilitator (or a co-presenter) jots into §1–3 in real time. Do not try to fill
§4 or §5 during S6 — those need a cooldown. **Fill within 2 working days after
S6:** §4 and §5.

## 1. Attendance and setting

- **Date / time of session:**
- **Room / venue:**
- **Audience count (approximate):**
- **Number of teams that formed during the activity:**
- **Any technical issues at start (projector, network, backend):**

## 2. Pitch section — audience signals (slides 1–6)

For each slide, note **one** observed reaction. Nods, blank faces, quick
questions, obvious distraction — all count. If nothing notable happened, write
"flat" — that is a data point.

| Slide                           | Observed reaction |
| ------------------------------- | ----------------- |
| 1 — Title + framing question    |                   |
| 2 — Problem in one endpoint     |                   |
| 3 — Three-angle matrix          |                   |
| 4 — Why both spec-based and CDC |                   |
| 5 — M5 metrics                  |                   |
| 6 — M6 teaser (8 of 10 pass)    |                   |

Questions asked during the pitch (verbatim if possible):

1.
2.
3.

## 3. Demo section — moments (slides 7–9)

- **Segment that landed hardest (which one and why):**
- **Segment that felt slowest / lost the room:**
- **Any technical failure during a live segment:** _(e.g., Apidog AI didn't
  return, provider verifier hung, broken-provider commit didn't fail as
  expected)_

## 4. Activity section — evidence from the room (slides 10–12)

Fill from the teams' worksheets and observed conversation. **Do not** guess team
findings — read from what they wrote.

| Team | Part 1 finding (endpoint + defect) | Part 2 finding (AI mistake) |
| ---- | ---------------------------------- | --------------------------- |
| A    |                                    |                             |
| B    |                                    |                             |
| C    |                                    |                             |
| ...  |                                    |                             |

- **Coverage of the seven defects in Appendix A** — tick each defect that at
  least one team identified during Part 1:
    - [ ] SEC-01 (password leak)
    - [ ] SEC-06 (self-promote to admin)
    - [ ] FR-07 (POST /api/cart no validation)
    - [ ] FR-08 (checkout trusts client total)
    - [ ] `{}`-on-404 quirk
    - [ ] Even-id price coercion
    - [ ] camelCase `orderId`

- **Coverage of the AI failure modes** — tick each pattern at least one team
  spotted during Part 2:
    - [ ] Invented field
    - [ ] Security-hole-as-feature (SEC-06 as `role` in a valid body)
    - [ ] Spec-conformant 404 that's actually 200
    - [ ] Unauthenticated "Success" case

- **Closing question response** — did any team land on "you'd need a contract
  test" without prompting? _(yes / no / partially)_

## 5. Post-session cooldown notes

- **What went better than expected:**
- **What went worse than expected:**
- **What one thing would we change for a re-run:**
- **Direct quotes (verbatim, one per line) worth keeping for `[AI-04]` §2 or
  `Material/Document/SUT-Reference/EShop_Failure_Modes.md`:**
    -
    -
    -

## 6. Handoff into S8

Items from this file that feed downstream:

- §3 technical failures → `Material/Document/SUT-Reference/EShop_Failure_Modes.md` as new candidates.
- §4 coverage ticks → `[AI-02]` §4 (live-seminar reflection) as quantitative
  evidence.
- §5 cooldown notes → `[AI-04]` §2 (post-seminar paragraph).
- Verbatim quotes → keep in a "Voices from S6" appendix if S8 audit pack
  supports one.

## 7. File placement

- This template: `Material/Deliveries/S7_Feedback/S7_Audience_Feedback_Template.md`
- Filled copy (post-S6): `Material/Deliveries/S7_Feedback/S7_Audience_Feedback.md` (copy the
  template, do not overwrite).
