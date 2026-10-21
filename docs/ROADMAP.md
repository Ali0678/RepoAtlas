# ROADMAP.md

Rules:
- Work one step at a time using the Step Protocol in `CLAUDE.md`.
- A step is done only when its Definition of Done (DoD) is met and Ali has confirmed.
- Tick a step by changing `[ ]` to `[x]`. Never reorder or add steps without Ali's approval and an ADR.
- Estimated effort assumes 3 to 4 focused hours per working day.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

---

## Phase 0: Setup (about 2 days)

- [x] **P0-S01 Repo and tooling**
  Init git repo, folder layout from `STACK.md`, `.gitignore`, `.editorconfig`, README stub, copy the docs.
  DoD: tree matches `STACK.md`, first commit made.
- [x] **P0-S02 Next.js scaffold**
  Create `apps/web` with TypeScript strict, Tailwind, ESLint, Prettier, pnpm.
  DoD: `pnpm dev` serves a page on port 3000, lint and type-check pass. Resolved versions recorded.
- [x] **P0-S03 Design foundation**
  Theme tokens (colors, spacing, fonts), dark theme, app shell layout, base components (Button, Input, Panel).
  DoD: shell renders with the design tokens, no hardcoded colors outside the token file.

## Phase 1: Frontend with mock data (about 2 weeks)

Teach in this phase: React fundamentals as needed, hooks, TypeScript types, component composition, Zustand, TanStack Query, sigma.js and graphology, Web Workers.

- [x] **P1-S01 Graph types and mock data**
  Define `GraphNode`, `GraphEdge`, `RepoGraph`. Write a generator script and produce a mock graph of about 150 nodes in 6 clusters.
  DoD: typed mock JSON loads, a data-access function `getGraph(id)` returns it.
- [x] **P1-S02 Landing page**
  Hero, repo URL input (non-functional), gallery placeholder cards.
  DoD: responsive page, input validates URL shape client-side.
- [x] **P1-S03 Graph canvas**
  Render nodes and edges with sigma and graphology from the mock data.
  DoD: graph visible, zoom and pan work.
- [x] **P1-S04 Layout and clusters**
  ForceAtlas2 in a Web Worker, node color by cluster, node size by LOC.
  DoD: layout converges without freezing the UI, clusters visually distinct.
- [x] **P1-S05 Interaction**
  Hover highlight, click select, camera animation to selected node, store-driven reducers.
  DoD: hover and select update through the Zustand store and reducers, no full re-render of the graph.
- [x] **P1-S06 Details panel**
  Side panel showing file path, language, LOC, symbols, neighbors.
  DoD: panel follows selection, neighbor click navigates.
- [x] **P1-S07 Search and filters**
  Search by path or symbol, filter by cluster and language, dim non-matching nodes.
  DoD: filters combine correctly, clearing restores the full graph.
- [ ] **P1-S08 Edge flow and visual polish**
  Animated edge emphasis on selection, glow, label rules (labels appear by zoom level).
  DoD: 60 fps on the mock graph on a normal laptop, no label clutter.
- [ ] **P1-S09 Chat panel UI**
  Chat panel with a mocked streaming response, citation chips that highlight nodes.
  DoD: typing a question streams mock tokens, clicking a chip focuses the node.
- [ ] **P1-S10 Impact mode UI**
  Select a node, choose depth, highlight dependents by depth with a ripple effect (mock computation on the client).
  DoD: depth slider updates highlights, legend explains depth colors.
- [ ] **P1-S11 Color modes**
  Cluster, complexity, and churn modes using mock metrics.
  DoD: mode switch recolors without re-layout, legend updates.
- [ ] **P1-S12 States and responsiveness**
  Loading, empty, and error states, keyboard accessibility for panels, mobile layout for non-canvas UI.
  DoD: every async view has the three states, Lighthouse accessibility check recorded.
- [ ] **P1-S13 Frontend tests and demo**
  Vitest for store and graph utilities, one Playwright smoke test (load, select, search). Record a short demo clip.
  DoD: tests pass in CI-ready scripts, clip saved.

## Phase 2: Backend and ingestion (about 2 to 3 weeks)

Teach in this phase: async Python, FastAPI dependency injection, SQLAlchemy 2 async, Alembic, Redis, ARQ, SSE, OAuth, tree-sitter, Docker Compose.

- [ ] **P2-S01 API scaffold**
  `apps/api` with uv, FastAPI app factory, settings, `/health`, ruff, type checker, pytest.
  DoD: `/health` returns 200, tests and linters pass. Type checker choice recorded in an ADR.
- [ ] **P2-S02 Docker Compose**
  Postgres (pgvector image), Redis, api, worker placeholder. `.env.example`.
  DoD: `docker compose up` brings up all services, api connects to both.
- [ ] **P2-S03 Database models and migrations**
  Models for users, repos, analyses, files, symbols, edges. Alembic initial migration. Chunks table added in P3.
  DoD: migration applies and rolls back cleanly, model tests pass.
- [ ] **P2-S04 GitHub OAuth and sessions**
  Login, callback, Redis session, httpOnly cookie, `/me`, logout, CSRF protection.
  DoD: full login flow works locally, session survives refresh, logout invalidates it.
- [ ] **P2-S05 Create analysis endpoint**
  Validate GitHub URL, resolve HEAD SHA, idempotent create, enqueue job, status endpoint.
  DoD: duplicate submit returns the same analysis, invalid URLs rejected with clear errors, tests cover SSRF cases.
- [ ] **P2-S06 Worker: clone and scan**
  ARQ worker, safe shallow clone with limits, file walk, language detection, size filtering, temp dir cleanup.
  DoD: worker populates `files` for a small repo, limits enforced, temp dirs always cleaned.
- [ ] **P2-S07 Parsing with tree-sitter**
  Extract symbols and imports for Python and TypeScript/JavaScript.
  DoD: unit tests with fixture files cover functions, classes, methods, and import forms.
- [ ] **P2-S08 Graph construction and metrics**
  Resolve imports to file edges, compute LOC and complexity, assign clusters by top-level directory.
  DoD: `edges` populated and correct on a fixture repo, unresolved imports counted not crashed on.
- [ ] **P2-S09 Progress streaming**
  Worker publishes stage events to Redis, API exposes SSE endpoint.
  DoD: browser or curl shows live stage progress for a running analysis.
- [ ] **P2-S10 Graph endpoint**
  `GET /analyses/{id}/graph` and file detail endpoint, size-aware, cacheable by SHA.
  DoD: response matches the frontend `RepoGraph` type.
- [ ] **P2-S11 Connect frontend to API**
  Generate TS types from OpenAPI, TanStack Query hooks, submit flow with live progress, replace mock source.
  DoD: paste a real repo URL, watch progress, see the real graph.
- [ ] **P2-S12 Hardening and CI**
  Rate limiting, concurrency caps, failure-path tests, GitHub Actions for web and api.
  DoD: CI green on both apps, failure modes from `ARCHITECTURE.md` section 13 each have a test or documented rationale.

## Phase 3: AI layer (about 3 weeks)

Teach in this phase: embeddings, chunking strategy, hybrid search, RRF, prompt design for grounded answers, structured outputs, tool use, agents, evals, LLM cost and latency.

- [ ] **P3-S01 Chunking and embeddings**
  Chunk by symbol, choose embedding model (ADR-011), pgvector index, `chunks` migration, embedding stage in the worker.
  DoD: chunks stored with vectors and `tsvector`, re-running the stage is idempotent.
- [ ] **P3-S02 Hybrid retrieval**
  Full-text plus vector plus RRF, as a service with a clean interface.
  DoD: unit tests for RRF, a manual retrieval check on a known repo.
- [ ] **P3-S03 Reranking (measured)**
  Add a rerank step behind a flag. Keep it only if the eval shows a gain (decided after P3-S09).
  DoD: flag works, comparison recorded in an ADR.
- [ ] **P3-S04 Grounded Q&A endpoint**
  Prompt with delimited context, streamed answer over SSE-over-POST, citation markers, server-side citation validation.
  DoD: answers stream, invalid citations are dropped and logged, tests cover validation.
- [ ] **P3-S05 Frontend citations**
  Replace the mock chat with the real endpoint, citation chips highlight real nodes.
  DoD: asking a real question highlights the cited files on the map.
- [ ] **P3-S06 Summaries and overview**
  Per-module and repo-level summaries generated with the smaller model, cached per analysis.
  DoD: overview panel renders from cached summaries, regeneration only on new SHA.
- [ ] **P3-S07 Agent tools and loop**
  Read-only tools, bounded loop, logging of every tool call.
  DoD: a multi-hop question is answered using tools, iteration cap enforced by a test.
- [ ] **P3-S08 Impact analysis endpoint**
  Reverse BFS endpoint, AI risk explanation, UI wired to real data.
  DoD: results match a hand-checked fixture, UI shows depth rings and the explanation.
- [ ] **P3-S09 Eval harness**
  Dataset format, 3 pinned repos, 40 or more questions, metrics script, results table.
  DoD: `python evals/run_eval.py` prints recall@k, citation precision, correctness, latency, cost, and stores an `eval_runs` row.
- [ ] **P3-S10 LLM observability and cost**
  Per-call usage logging, daily caps, answer cache, optional tracing tool.
  DoD: cost per query visible, caps enforced by a test.

## Phase 4: Polish and ship (about 2 weeks)

- [ ] **P4-S01 Incremental re-indexing (stretch, optional)**
  Re-process only changed files for a new SHA.
  DoD: second analysis of a changed repo is measurably faster, correctness test passes.
- [ ] **P4-S02 History depth and churn (stretch, optional)**
  Bounded history fetch, churn per file, timeline data.
  DoD: churn mode works on real data.
- [ ] **P4-S03 End-to-end tests**
  Playwright flows: gallery view, submit repo, ask question, impact mode.
  DoD: E2E suite in CI.
- [ ] **P4-S04 Load test**
  Locust or k6 against read and ask endpoints. Record requests per second and p95.
  DoD: numbers recorded in `PROGRESS.md` and README.
- [ ] **P4-S05 Deployment**
  Deploy web, api, worker, Postgres with pgvector, Redis. Verify provider support for pgvector before choosing.
  DoD: public URL works end to end, secrets only in provider config.
- [ ] **P4-S06 Gallery**
  Pre-analyze 5 to 8 famous repositories, public no-login gallery.
  DoD: gallery loads instantly for anonymous users.
- [ ] **P4-S07 README and demo**
  Architecture diagram (Mermaid), setup guide, eval table, load-test table, 60-second demo video, resume bullets with real numbers.
  DoD: a stranger can clone, run, and understand the project from the README.
