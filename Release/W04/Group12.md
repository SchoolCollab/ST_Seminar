# Weekly Report

## General Information

- **Group ID:** Group 12
- **Group Name:** SoloLevelling
- **Project Name:** T06 — API & Contract Testing
- **Date range:** 2026-06-29 – 2026-07-04

## Tasks Completed This Week

**23127390 – Huỳnh Đăng Khoa**

- Studied the Seminar Track workflow and the T06 topic brief; identified the S1–S8 stages, deliverables, and the seminar rubric.
- Surveyed candidate API- and contract-testing tools across licence cost, learning curve, EShop fit, AI capability, and community.
- Selected the toolset for T06, each best-fit in its own category:
  - Apidog (manual mode) for traditional API testing.
  - Apidog AI for AI test generation from the OpenAPI spec.
  - Pact for consumer-driven contract testing and CI/CD-oriented.
- Wrote and finalized the S1 Tool Survey & Proposal.

## AI Usage Declaration

Prepared per the course AI Usage Guidelines (Section 5, Option B). AI was used only for permitted purposes: knowledge lookup, and suggesting report/proposal structure and wording (Guidelines §4.1 and §4.3). No analysis, results, or complete report was auto-generated; all output was reviewed, edited, and validated by the student.

**Tool:**

- Claude (Anthropic), model Claude Opus 4.8, platform claude.ai

**Access time and purpose:**

- 2026-05-31: Tool selection preparation before the meeting
- 2026-07-04: Report preparation for submission

**Evidence (chat history / screenshots):** Exported screenshots of the AI chat history, included in this submission as `Evidence/1.png` – `Evidence/9.png`. Each row below cites the screenshot(s) that support it.

| #   | Prompt (summarized)                                                                                                                          | Purpose                                                  | What AI generated                                                                   | What the student did independently / how validated                                                                                                          | Evidence                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | "Explain in detail what my team must do during the T06 seminar" (with the guide + brief attached)                                            | Understand the seminar workflow and T06 scope            | A summary of the S1–S8 stages and deliverables                                      | Read the original guide and brief to confirm each point; used AI only to orient, not as the source                                                          | `Evidence/1.png`                                                       |
| 2   | "Suggest tool combinations for T06," "I want different choices," "proceed with Apidog," plus my solo-team constraints                        | Brainstorm and choose the toolset                        | A list of candidate tools with trade-offs, and a draft proposal built around Apidog | Made the final tool decision myself — Apidog (manual) + Apidog AI + Pact, no separate backup; verified cost/feature claims against the tools' official docs | `Evidence/2.png`, `Evidence/3.png`, `Evidence/4.png`                   |
| 3   | "Focus on responses for the demo; create detailed comparisons against each tool and prepare defenses (why this tool / why this combination)" | Prepare tool comparisons and oral-defense answers (§4.1) | Draft comparison points and defense talking points                                  | Reviewed and rephrased in my own words; kept only claims I could verify against primary sources                                                             | `Evidence/5.png`                                                       |
| 4   | "I need to do a weekly report [requirements link]," "here are the total requirements," and formatting the AI Usage Notes appendix            | Prepare and format this weekly report (§4.3)             | Draft report structure and the AI Usage Notes appendix format                       | Supplied the real content and dates, edited the wording, and validated the format against the course AI Usage Guidelines                                    | `Evidence/6.png`, `Evidence/7.png`, `Evidence/8.png`, `Evidence/9.png` |

## Tasks Planned for Next Week

- Make proper planning for the later weeks.
- Prepare EShop's OpenAPI specification and import it into Apidog.
- Hand-build the core API flow in Apidog with chained-token authentication and manual assertions.
- Generate a test suite from the same spec with Apidog's AI; begin the hand-built-vs-AI diff.
- Look for another project to use this setup on for the demo purpose.

## Issues

- **Solo group capacity.** With one member, the workload of an 8-stage seminar is a risk but temporarily addressed by deliberately choosing a low-setup stack. Also, due to urgent deadlines that I've had during the past few weeks, no major progress was made for this seminar; the only deliverable for this weekly report is the tool selection which I've done before the three-week break.
- **Lack of preparation and planning.** No proper tasks planning is yet to develop. Therefore, it's of the highest priority thing for me to do for the next week.
