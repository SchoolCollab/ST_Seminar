# [AI-04] Reflective Statement on AI Use

**Target length:** 300 words (S1 rubric).
**Current word count of §1 (pre-seminar): ~250 words.** §2 (post-seminar
reflection) is a ~50-word placeholder to bring the total to 300 after S6.

---

## §1 — Pre-seminar reflection (draftable now)

The seminar's central question — _when does an AI-generated test miss
something a hand-written one would catch?_ — turned out to be a mirror.
Every AI tool we used to _build_ the project is subject to the same
critique we levy against Apidog AI in the talk itself.

**Where AI genuinely accelerated us.** Claude drafted the User Guide's
Installation and First Test sections from four source documents in
minutes; a manual transcription would have consumed most of a Wednesday.
GitHub Copilot scaffolded the Pact consumer tests, which meant iteration
1 shipped instead of stalling on boilerplate. Both wins share a shape:
the AI was fastest where the answer was already committed to a source
file we controlled.

**Where AI misled us — and taught us more by doing so.** Copilot's Pact
contract asserted `order_id` on `POST /api/checkout`. The server returns
`orderId`. Chasing that failure surfaced a real, separate inconsistency
in the SUT and became one of two documented M6 findings. Claude, given
the OpenAPI spec, produced an early prose paragraph that treated `role`
as a normal client-settable field — the same failure mode we predicted
Apidog AI would exhibit against `PUT /api/users/me`. Both incidents
reinforced the rule that made the audit tractable: every AI-produced
claim about the SUT gets cross-checked against `server.js` or the SRS,
not against the OpenAPI spec.

The lesson isn't that AI is untrustworthy. It's that the spec is not
the truth. That is the pitch on slide 2.

## §2 — Post-seminar reflection (placeholder, ~50 words)

**To be written within 2 working days after S6.**

Expected contents: which slide the audience pushed back on hardest;
whether the live Apidog AI demo generated anything unexpected in front
of the room; whether the closing Pact question landed on the intended
answer or somewhere more interesting.

---

## Notes for finalizing

- Read §1 aloud once before signing — it must sound like the person
  whose name is on the form, not like the tool that drafted it.
- If the total word count runs over 300 after §2 lands, trim the second
  paragraph of §1 first (the Copilot / Claude examples are the softest
  content).
- Cross-references: this statement is not a duplicate of `[AI-02]`;
  it's the first-person reflection on the same events.
