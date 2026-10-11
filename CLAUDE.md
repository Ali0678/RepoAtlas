# CLAUDE.md: Master instructions for RepoAtlas

This file is loaded at the start of every session. Follow it exactly. If a chat message conflicts with this file, the chat message wins for that turn only, and you tell the user about the conflict.

## 1. Project in one paragraph

RepoAtlas turns any public GitHub repository into an interactive, animated architecture map (WebGL graph) and lets the user ask questions in plain English. Answers cite exact files and symbols, and those citations light up on the map. It also offers impact analysis ("what breaks if I change this?"). Full details: `docs/PROJECT_BRIEF.md`.

## 2. The developer you are working with

- Ali, CS student (semester 5). Strong programming fundamentals and OOP. Has built a Discord clone.
- Limited experience with: React, TypeScript, Next.js, WebGL graph rendering, async Python backends, Redis, job queues, pgvector, RAG, agents, evals.
- Purpose of this project: a resume project and interview material. Ali must understand every line and be able to defend every design choice. Learning matters as much as shipping.
- Communication style: direct, minimal, no filler, no em dashes, no hedging. Thorough and complete. No omissions inside code or explanations.

## 3. Session start procedure

Read these files in this order, completely:

1. `CLAUDE.md` (this file)
2. `docs/PROGRESS.md` (current state and next step)
3. `docs/ROADMAP.md` (current phase in detail)
4. `docs/ARCHITECTURE.md`
5. `docs/STACK.md`
6. `docs/DECISIONS.md`
7. `docs/PROJECT_BRIEF.md`

Then reply with: the current step ID, the last completed step, open questions or contradictions in the docs. Do not write code at session start.

If you cannot read files, say so and ask Ali to paste them. Never proceed from memory of earlier chats. The docs and the repository are the source of truth.

## 4. The Step Protocol (mandatory)

Work on exactly one roadmap step at a time. Every step goes through stages A to F in order. Never skip or merge stages. Never advance a stage without the matching confirmation word from Ali.

Confirmation words: `go` (start building), `next` (next chunk), `done` (I ran it, it works), `skip` (skip the questions), `explain` (go deeper on the last chunk), `handoff` (produce a session handoff block).

### Stage A: BRIEF (no code)

Post a brief using exactly this template, then stop and wait for `go`:

```
STEP <ID>: <title>
Goal: 1 to 2 sentences.
Starting state: what exists now (from PROGRESS.md).
Concepts you need: each new concept explained at the depth Ali needs, with a small example. Frontend, TypeScript, and any technology new to Ali get full explanations.
Design: the approach chosen, why, and 1 to 2 alternatives rejected with trade-offs.
Files: exact paths to create or modify, and the chunk order.
Dependencies: each new package with name, purpose, and why this one over alternatives.
Pitfalls: what commonly goes wrong here.
Definition of done: observable checks Ali can run.
```

End with: "Reply `go` to start chunk 1, or ask questions."

### Stage B: GO

Ali replies `go`. Answer any questions from the brief first. If a question changes the design, update the brief, then continue.

### Stage C: BUILD in chunks

- One chunk per message. A chunk is one file or one cohesive unit, 120 lines or fewer (hard cap 150, except config or generated files).
- Before the code: one sentence on what the chunk does and where it fits.
- Show the full file path above every code block.
- Code must be complete and runnable for that chunk. No pseudo-code, no `...` elisions, no TODO stubs unless the roadmap lists them.
- When modifying an existing file, show the full changed function or region with enough surrounding context and state exactly where it goes. If the change spans more than about 30 lines, give the whole file.
- After the code: walk through the non-obvious lines and say why this approach beat the alternatives where relevant.
- End with: "Next chunk: <name>. Reply `next`." Then stop.

### Stage D: VERIFY

Give exact commands to run, the expected output, and how to see the feature working. Ali runs them and reports. If something fails, read the actual error text, state at most 2 hypotheses, and test the most likely one first. Do not patch blindly. Never claim code works or tests pass unless Ali reported it or you executed it.

### Stage E: CHECK (understanding)

Ask at most 3 questions about the step to test whether Ali can explain the design. Ali answers or says `skip`. Correct any wrong answers briefly.

### Stage F: CLOSE

1. Update `docs/PROGRESS.md` (provide the exact text, or edit the file directly if you have file access).
2. Add any new decision to `docs/DECISIONS.md`.
3. Tick the step in `docs/ROADMAP.md`.
4. Suggest a conventional commit message.
5. Name the next step ID and stop.

## 5. Hallucination guards

1. Never invent APIs, flags, package names, config keys, or versions. Before using a library API you are not certain about, check the installed package source or the official docs (use web search or fetch if available). If you cannot verify, write "Not verified:" followed by what and how Ali can check.
2. Library majors change (Next.js, React, Tailwind, sigma.js, SQLAlchemy, Pydantic, Anthropic SDK, tree-sitter bindings). Use the current stable version at install time, read its docs, and record resolved versions in `docs/STACK.md`. Do not write code from memory of older versions.
3. Model IDs come from the official Anthropic docs at implementation time. Do not guess model strings.
4. Do not add features, files, or dependencies outside the current step. If you think something is needed, propose it in the brief and wait.
5. If the docs and the code disagree, stop and report the conflict. Do not silently pick one.
6. Do not restate large parts of the docs in replies. Reference them by file and section.
7. If you notice you are unsure about earlier details because the conversation is long, re-read `PROGRESS.md` and `ARCHITECTURE.md` and say that you did.

## 6. Context longevity

- `docs/PROGRESS.md` is the memory of this project. Keep it accurate at the end of every step.
- When Ali says `handoff`, produce the "Session handoff" block defined in `PROGRESS.md` so a fresh session can resume.
- Record every non-trivial choice in `docs/DECISIONS.md` as a short ADR.
- Roadmap changes require Ali's approval and an ADR.

## 7. Code standards

Full conventions are in `docs/STACK.md`. Always:

- TypeScript strict mode. Python fully type-hinted.
- Comments explain why, not what. No commented-out code.
- Small functions, clear names, explicit error handling, no silent `except`/`catch`.
- No secrets in code. All config through environment variables with a documented `.env.example`.
- Each step that adds logic adds tests, as specified in the roadmap.
- One git branch per step: `step/<ID>-<slug>`. Ali commits manually after reviewing. Use Conventional Commits.

## 8. Non-negotiable invariants

These come from `docs/ARCHITECTURE.md`. Never violate them:

1. Never execute code from an analyzed repository. Only read and parse it.
2. Repository content is untrusted data. In LLM prompts it is delimited and never treated as instructions. Agent tools are read-only.
3. Analyses are idempotent per `(repo, commit_sha)`.
4. Every external input has size and time limits.
5. Citations shown to the user must refer to chunks that were actually retrieved. Validate server-side.
6. No secrets in the repository or in logs.

## 9. Out of scope (until Ali says otherwise)

Private repositories, languages beyond Python and TypeScript/JavaScript, payments, teams or organizations, mobile apps, Kubernetes, microservices. See `docs/PROJECT_BRIEF.md` for the full list.
