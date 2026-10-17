# STACK.md

Use the current stable version of each tool at install time. After installing, record the resolved versions in the "Resolved versions" table at the bottom. Never code against remembered APIs: read the installed version's docs.

## 1. Stack by layer

### Frontend (`apps/web`)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS |
| Animation (UI) | Framer Motion |
| Graph rendering | sigma.js (WebGL) + graphology |
| Graph layout | graphology-layout-forceatlas2 (run in a Web Worker) |
| Client state | Zustand (selection, filters, color mode, panels) |
| Server state | TanStack Query |
| API types | Generated from the backend OpenAPI schema with `openapi-typescript` |
| Validation | Zod where untrusted data enters the client |
| Unit tests | Vitest + Testing Library |
| E2E tests | Playwright |
| Lint and format | ESLint, Prettier |
| Package manager | pnpm |
| Runtime | Node.js current LTS |

### Backend (`apps/api`)

| Concern | Choice |
|---|---|
| Language | Python (current stable 3.12 or newer), fully type-hinted |
| Framework | FastAPI, async |
| Validation and settings | Pydantic v2, pydantic-settings |
| ORM | SQLAlchemy 2.x (async) with asyncpg |
| Migrations | Alembic |
| Database | PostgreSQL with pgvector extension |
| Cache, queue broker, pub/sub, sessions | Redis |
| Background jobs | ARQ |
| Code parsing | tree-sitter (Python bindings) with Python and TypeScript/JavaScript grammars |
| Git operations | `git` CLI via subprocess with strict arguments (no shell), or a vetted library chosen in an ADR |
| HTTP client | httpx |
| Auth | GitHub OAuth, server-side session in Redis, httpOnly cookie |
| Tests | pytest, pytest-asyncio, httpx test client |
| Lint, format, types | ruff, mypy (or pyright, decided in P2-S01) |
| Package manager | uv |
| Load testing | Locust or k6 (decided in P4) |

### AI layer

| Concern | Choice |
|---|---|
| LLM provider | Anthropic Claude API via the official Python SDK |
| Model IDs | Take from the official Anthropic docs at implementation time. Stronger model for Q&A and agent, smaller model for summaries. Record in an ADR. |
| Embeddings | Decided in P3-S01 (ADR-011). Anthropic does not offer its own embedding model. Options: a local open-source model, Voyage AI, or another provider. Default: local open-source model for zero cost. |
| Retrieval | Hybrid: Postgres full-text search (`tsvector`) + pgvector similarity, merged with Reciprocal Rank Fusion, then optional reranking |
| Structured output | Tool use or JSON schema output with Pydantic validation |
| Tracing | Structured logs first. Optional Langfuse (self-hosted) in P3-S10. |

### Infrastructure

| Concern | Choice |
|---|---|
| Local dev | Docker Compose: postgres (pgvector image), redis, api, worker |
| CI | GitHub Actions: lint, types, tests, build |
| Deploy: web | Vercel |
| Deploy: api, worker | Render or Fly.io (decided in P4-S05) |
| Deploy: database | A Postgres host that supports pgvector (verify at deploy time; Neon, Supabase, or Render Postgres) |
| Deploy: redis | Managed Redis free tier (verify at deploy time) |

## 2. Repository layout

```
repoatlas/
  CLAUDE.md
  README.md
  docker-compose.yml
  .env.example
  .github/workflows/
  docs/
    PROJECT_BRIEF.md  STACK.md  ARCHITECTURE.md
    ROADMAP.md  PROGRESS.md  DECISIONS.md
  apps/
    web/
      src/
        app/                 # Next.js routes
        components/          # shared UI components
        features/
          graph/             # sigma setup, layout worker, reducers
          chat/              # Q&A panel, citation chips
          impact/            # impact analysis UI
          repo/              # submit repo, progress
        lib/                 # api client, utils
        mocks/               # mock graph JSON (Phase 1 only)
        store/               # Zustand stores
        types/               # shared TS types (generated + hand-written)
    api/
      app/
        main.py
        core/                # config, security, logging, limits
        db/                  # models, session, base
        api/v1/              # routers
        schemas/             # Pydantic request/response models
        services/            # analysis, graph, search, llm, agent
        workers/             # ARQ tasks
      alembic/
      tests/
  evals/
    datasets/                # pinned repos, questions, gold answers
    run_eval.py
  scripts/
```

## 3. Conventions

### General
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Branch per roadmap step: `step/P1-S03-graph-canvas`.
- `.env` is never committed. `.env.example` documents every variable.
- Every new dependency is justified in the step brief.

### TypeScript
- `strict: true`, no `any` without a comment explaining why.
- Components are function components. One component per file. Name file after the component.
- React owns UI chrome. sigma owns the canvas. Sync them through the Zustand store and sigma's `nodeReducer` and `edgeReducer`, not by re-rendering React per frame.
- Data fetching only through TanStack Query hooks in `lib/` or `features/*`. No fetch calls inside components.
- Prefer named exports. Default exports only where Next.js requires them.

### Python
- Layering: `api` (HTTP only) -> `services` (business logic) -> `db` (persistence). Routers contain no business logic.
- All I/O is async. CPU-bound parsing runs in the worker, not in request handlers.
- No bare `except`. Raise typed domain errors, translate them at the API layer.
- Pydantic models for all request and response bodies. Never return ORM objects directly.
- Database access only through sessions from a FastAPI dependency.

### Testing
- Unit tests for pure logic (parsing, graph building, RRF, chunking).
- Integration tests for API plus database using a test database.
- Frontend: Vitest for logic and hooks, Playwright for key flows.
- A step that adds logic is not done until its tests exist and pass.

## 4. Environment variables (initial list, extend as needed)

```
DATABASE_URL=
REDIS_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=
ANTHROPIC_API_KEY=
EMBEDDING_PROVIDER=
WEB_ORIGIN=http://localhost:3000
API_ORIGIN=http://localhost:8000
```

## 5. Local ports

| Service | Port |
|---|---|
| web | 3000 |
| api | 8000 |
| postgres | 5432 |
| redis | 6379 |

## 6. Resolved versions (fill in during P0 and later steps)

| Tool | Version | Recorded in step |
|---|---|---|
| Node.js | 22.23.1 | P0-S01 |
| pnpm | 12.11.2 | P0-S01 |
| Next.js | 16.4.0 | P0-S02 |
| React | 19.3.0 | P0-S02 |
| Tailwind CSS | 4.3.3 | P0-S02 |
| sigma | 3.0.3 | P1-S03 |
| graphology | 0.26.0 | P1-S03 |
| Python | 3.14.7 | P0-S01 |
| uv | 0.13.0 | P0-S01 |
| FastAPI | | |
| Pydantic | | |
| SQLAlchemy | | |
| Alembic | | |
| ARQ | | |
| tree-sitter | | |
| anthropic SDK | | |
| PostgreSQL / pgvector | | |
| Redis | | |
