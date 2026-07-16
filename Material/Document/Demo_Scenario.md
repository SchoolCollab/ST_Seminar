# T06 · S1 Demo — Full Response Kit

**Huỳnh Đăng Khoa (solo)** · Topic T06 — API & Contract Testing **Stack:**
Apidog (manual + AI) · Pact (contract) · Postman + Postbot (backup)

> Speakable answers for the brief intro. Open with the pitch, then pull the
> right section as questions come. Deep tool comparisons live in the separate
> Defense Brief; this kit adds Workflow and Setup.

---

## 0 · Opening pitch (30 seconds)

> "T06 is _API and Contract_ testing, and the AI angle hinges on reading the
> OpenAPI spec. I picked **Apidog** — design-first and OpenAPI-native — so the
> spec drives everything, and I get a manual workflow _and_ AI test generation
> in one free tool, making my traditional-vs-AI comparison apples-to-apples. I
> add **Pact** for the contract half, and keep **Postman + Postbot** as a backup
> so I'm not betting the grade on a less-familiar tool."

---

## A · Why this tool (Apidog) — extended

> Lead with #1. The rest are reinforcing arguments to deploy as questions probe
> deeper.

**1. It fits the topic's core question better than a request-first tool.**

> "T06 asks whether AI should read the OpenAPI spec for you. Apidog is
> _design-first_: you import the spec and it becomes the living source of truth
> that drives requests, tests, mocks, and docs. A request-first tool like
> Postman treats the spec as an import; Apidog treats it as the centre. For a
> topic literally about the spec, that paradigm match is my strongest reason."

**2. Traditional and AI from the same spec = a clean, controlled comparison.**

> "Because the manual tests and the AI-generated tests both come from one spec
> in one tool, the only variable in my comparison is _who wrote them_ — me or
> the AI. That isolates exactly what AI adds and misses, which is the lesson the
> seminar wants me to demonstrate. Doing this across two different tools would
> muddy the comparison."

**3. Auto-validation against the spec makes 'contract drift' visible.**

> "Apidog can auto-validate a response against the API spec, not just against
> assertions I hand-write. That's directly on-topic: it surfaces when the
> running API has drifted from its declared contract — a softer, always-on
> cousin of the Pact contract test, and a natural bridge into the contract half
> of T06."

**4. Smart mock server removes my biggest solo risk — a flaky SUT.**

> "The moment an endpoint is defined, Apidog generates a mock server with
> realistic data based on field names. So if EShop is down or an endpoint isn't
> wired up, I can still build and demo tests against the mock. Solo, with no
> teammate to cover for me, that resilience is a real advantage on demo day."

**5. One free tool spans the whole lifecycle — efficient for one person.**

> "Apidog covers design → debug → test → mock → document in a single workspace.
> For a solo team that means no context-switching between Swagger, a client, a
> mock tool, and a docs generator — I spend my time on the actual study and
> comparison, not on gluing tools together. And it's free for everything I
> need."

**6. Interoperability means choosing it costs me nothing later.**

> "Apidog imports and exports OpenAPI, and also reads/writes Postman collection
> format. So my work isn't locked in — if I ever pivot to Postman, the spec and
> collections carry over. Choosing Apidog is a low-risk decision, not a one-way
> door."

**7. Differentiation that proves I surveyed the category.**

> "Most teams will reach for Postman by default. Choosing Apidog forced me to
> actually evaluate the category on the five criteria — which is precisely what
> the 'tool survey' stage is graded on. I'm not picking the unusual tool for its
> own sake; I'm picking the one that fits a spec-driven topic, and I can defend
> every axis."

**Honesty guardrail (say if pushed on hype):**

> "I'm careful here — a lot of 'Apidog is #1 in 2026' content online is
> vendor-sponsored press releases. Every capability I've claimed comes from
> Apidog's own documentation, which I can show. I don't cite the ranking
> articles."

---

## B · Why this combination

- **Apidog** covers API testing; **Pact** covers contract testing — the "&
  Contract" half others skip.
- Coherent, not a grab-bag: one design-first tool + one contract layer + one
  safety net, each with a distinct job.
- Right-sized for one person: heavy lifting in a single low-setup tool, with a
  fallback that guarantees a deliverable.

---

## B2 · Why contract testing is necessary, and why Pact _(new)_

### Why contract testing at all (it's half the topic)

> "The topic is API _and Contract_ testing. My Apidog tests answer 'did this
> endpoint work when I called it?' A contract test answers a different question:
> 'do the consumer and provider still _agree_ on the shape of the data?' Those
> aren't the same — an API can return 200 and still have quietly renamed a field
> or changed a type, which silently breaks every client. Contract testing
> catches that drift earlier and faster than end-to-end tests, so skipping it
> would leave half the topic — and the more interesting half — untouched."

### Why it matters _specifically_ against the AI angle

> "It also sharpens my AI lesson. AI generates tests from the _declared_ spec,
> so it assumes the spec is the truth. A contract test is what actually checks
> whether the running provider still honours that spec. So contract testing is
> the human safety net for exactly the blind spot AI has — that's a clean
> narrative for the seminar."

### Why Pact (not the other contract-testing tools)

> "I compared Pact against the real alternatives — Spring Cloud Contract and
> Specmatic — not against Apidog or Postman, because those are API clients, not
> contract tools. Three reasons Pact wins for EShop:
>
> 1. **Stack fit** — EShop's backend is Node, and Pact has first-class
>    JavaScript support (`@pact-foundation/pact`). Spring Cloud Contract is
>    JVM-first and would drag a whole Java/Groovy toolchain into a solo project;
>    Specmatic also runs on the JVM.
> 2. **The right model** — Pact is _consumer-driven_: the consumer states what
>    it needs, and the provider is verified against it. That's the textbook form
>    of contract testing and the clearest one to teach in 20 minutes.
> 3. **Standard + free + documented** — Pact is the open-source industry
>    standard with the largest community, so I get the most learning material
>    and the lowest risk for a one-person team."

### One-line version for Q&A

> "Contract testing is the 'do we still agree' check that response tests miss,
> and it's the human counter to AI's blind trust in the spec. I chose Pact
> because EShop is Node and Pact is JS-native and consumer-driven, while the
> alternatives are JVM-bound."

### Honest scope statement (say it before you're pushed)

> "To be clear about scope: I'm doing _one_ provider verification to demonstrate
> the concept, not a full Pact Broker pipeline. That's deliberate — enough to
> teach it, sized for a solo team."

### If asked "why not just use Karate or Specmatic for everything?"

> "Some tools bundle API and contract testing, but for a teaching seminar I want
> the two ideas _visibly separate_: Apidog shows API testing and the AI
> comparison, Pact shows contract testing as its own distinct discipline.
> Merging them into one DSL would blur the very distinction the topic is about."

---

## C · Workflow _(new)_

### C1 — The testing workflow (how I'll actually test EShop)

> "I run a spec-driven loop:
>
> 1. **Import** EShop's OpenAPI spec into Apidog so it's the single source of
>    truth.
> 2. **Hand-build** the core flow — login → products → cart → orders — with
>    chained-token auth and my own assertions. That's my human, business-aware
>    baseline.
> 3. **Generate** tests from the same spec with AI.
> 4. **Diff** the two — what AI covered, what it missed, what it got wrong.
> 5. **Contract-verify** one consumer expectation against EShop's Node backend
>    with Pact.
> 6. **Document** failure modes and contract violations, and capture metrics
>    (setup time, run time, flake rate)."

### C2 — The project workflow (what happens from here)

> "I'm at **S1** now — this proposal. Next is **S2** approval, where I lock the
> tools with the instructor. Then **S3** is the deep study using the loop above;
> **S4** is the user guide plus a 5–8 minute screencast; **S5** I pre-share
> everything three working days early; **S6** is the 45-minute live seminar —
> pitch, live demo, the audience activity, and Q&A; **S7** is collecting
> feedback; **S8** is the AI audit and reflection."

### C3 — "How does AI fit in without you just trusting it?"

> "AI is a generator, not an authority. Everything it produces goes through the
> diff step and gets audited against the spec and business rules before I keep
> it — which is exactly the lesson the seminar wants: AI covers the declared
> schema but misses business rules, so a human verifies."

### C4 — "How do you keep the traditional-vs-AI comparison fair?"

> "Both sides start from the _same_ OpenAPI spec in the _same_ tool, so the only
> variable is who wrote the tests — me or the AI. That isolates what AI actually
> adds or misses."

---

## D · Setup _(new)_

### D1 — "What does setting this up involve?"

> "Less than people expect, because Apidog is GUI-based. Four pieces: Apidog
> itself, EShop running locally, an AI model connection, and Node for the one
> Pact test. No Java toolchain."

### D2 — Apidog

> "Free desktop download, version 2.7.18 or later. Create a project, **Import →
> OpenAPI** to load EShop's spec, and set an environment variable for the
> backend base URL. That's it — minutes, no build tooling."

### D3 — EShop (the system under test)

> "Run EShop locally — frontend and backend — per the repo README, or connect to
> the lecturer's staging environment. I just need the backend base URL and a
> valid login to chain the auth token."

### D4 — AI model connection

> "In Apidog: Settings → **AI Features** → enable, then **+ Add Provider** and
> connect a model — an API key, a custom endpoint, or a **local model via
> Ollama**. Apidog doesn't sell its own credits; cost lives with the model I
> connect, so a local or free-tier model makes it $0. An external LLM like
> Claude/ChatGPT is my equivalent free fallback."

### D5 — Pact (contract layer)

> "Node 18+, then
> `npm install @pact-foundation/pact @pact-foundation/pact-core`. I write a
> small consumer expectation, which produces a contract file, then run the
> provider verifier against the running EShop backend. For one verification I
> don't need a Pact Broker — that's a CI concern I'll just mention."

### D6 — Backup (Postman + Postbot)

> "If S2 prefers it, Postman is a free account, import the same spec, and
> Postbot's AI is enabled through the account — so the pivot costs no setup
> time."

### D7 — "What if you can't get EShop running?"

> "Two fallbacks: the lecturer's staging environment, and Apidog's built-in mock
> server, which can stand in for endpoints I haven't wired up yet — so setup
> problems don't block the testing work."

---

## D8 · Why Postman + Postbot is a _clean_ fallback (not just "another tool")

> The point isn't "Postman also exists." It's that switching costs almost
> nothing because both tools share the same foundation — the OpenAPI spec.

**1. Same input — the spec is portable.**

> "Apidog and Postman are both spec-driven. The same EShop OpenAPI file I import
> into Apidog imports straight into Postman and auto-generates an equivalent
> collection — folders, requests, and example responses. So my source of truth
> carries over; I'm not rebuilding from scratch, just changing the GUI around
> it."

**2. Same workflow — my test design transfers.**

> "My plan — hand-build the login → products → cart → orders flow with
> chained-token auth, then generate tests with AI, then diff — is identical in
> Postman. The traditional half is a normal collection; the AI half is Postbot
> instead of Apidog AI. The _methodology_ doesn't change, so my S3 study and my
> demo structure stay intact."

**3. Self-sufficient — it covers both halves of the pairing rule alone.**

> "A backup is only useful if it can stand on its own. Postman does: the
> collection is the traditional feature, and Postbot — its built-in AI —
> generates assertions and edge cases for the AI feature. So even on the
> fallback, I still satisfy 'one traditional AND one AI feature.'"

**4. Pact still layers on top — unchanged.**

> "Pact sits below the API client either way; it verifies EShop's backend
> regardless of whether my API tests live in Apidog or Postman. So the contract
> half is untouched by the switch."

**5. Lowest pivot cost + zero approval risk.**

> "Postman is a free account, no toolchain, and it's the brief's own worked
> example — so it's approvable by default. If S2 wants a more familiar tool, or
> Apidog disappoints, I pivot in minutes without losing study time or breaking
> any requirement."

**One-line version for Q&A:**

> "It's a clean fallback because it eats the same OpenAPI spec, supports the
> same hand-build-then-AI-then-diff workflow, and carries both the traditional
> and AI halves on its own — so switching changes the interface, not my method."

**If pushed on differences (be honest):**

> "Two real differences: Postman's free plan is single-user and Postbot's AI is
> metered (~50 credits/mo), whereas Apidog is up to 4 users and
> bring-your-own-model. That metering is exactly why Postman is my backup, not
> my main — but for a fallback it's more than enough."

---

## E · Likely tough questions (quick answers)

- **"Why not just Postman?"** → It's my backup; but it's request-first and its
  AI is metered. For a topic about reading the spec, Apidog's design-first model
  fits better.
- **"Apidog is young/small — risky?"** → I cite only its own docs, not the
  sponsored hype, and I hold Postman as a full backup.
- **"Is the AI really free?"** → Bring-your-own-model; connect a local/free-tier
  model and it's $0.
- **"Why Pact?"** → A contract test catches a renamed field or changed type
  before end-to-end tests do; it's the free, consumer-driven standard. One
  verification demonstrates it.
- **"You're solo — too much?"** → That's why it's low-setup: one GUI tool does
  most of it, AI is one action, Pact is scoped to a single verification, and the
  backup guarantees a deliverable.

---

## F · Honest concessions (say before you're cornered)

- Apidog has a smaller community than Postman → mitigated by the Postman backup
  and Apidog's own docs/Discord.
- It's less familiar in class → I'll budget ~30 seconds to orient the audience
  in my demo.
- One Pact verification is a demonstration, not production contract testing → I
  state that scope rather than overclaim.
