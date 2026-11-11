# PROGRESS.md

This file is the project's memory. Update it at Stage F of every step. Keep it accurate and short. The AI must read it at the start of every session.

## Current status

- Phase: 2 (Backend and ingestion); Phase 1 complete, confirmed by Ali
- Current step: P2-S04 (not started)
- Last completed step: P2-S03
- Last updated: 2026-11-11

## Environment facts

- OS: Fedora Linux
- Editor: (fill in your editor)
- Node.js: v22.23.1
- pnpm: 12.11.2
- Python: 3.14.7
- uv: 0.13.0
- Docker: 29.8.2 / Compose v5.5.1
- Git: 2.55.0
- Git remote: https://github.com/Ali0678/RepoAtlas.git

## Working preferences

- The AI supplies implementation code in chat, one explained chunk at a time. Ali writes and edits the codebase himself. Documentation edits require explicit authorization; Ali authorized this ROADMAP.md and PROGRESS.md update.
- Ali normally runs the app and verification commands; the AI may run checks when explicitly requested. Ali runs all git commands. Claims of passing checks require executed results or Ali’s confirmation.
- Each step ends with a "Version control" block listing the exact git commands to commit and push. Ali runs them.

## Completed steps

| Step | Date | Summary (1 line) | Commit |
|---|---|---|---|
| P0-S01 | 2026-10-11 | Repo skeleton, .gitignore, .editorconfig, .env.example, installed pnpm and uv | bb0fdb6 |
| P0-S02 | 2026-10-14 | Next.js 16 App Router scaffold with TypeScript strict, Tailwind v4, ESLint 9, Prettier | 51e821d |
| P0-S03 | 2026-10-14 | Theme tokens, dark palette, AppShell layout, base components (Button, Input, Panel) | f089312 |
| P1-S01 | 2026-10-14 | Graph types, mock graph generator (150 nodes, 6 clusters), and getGraph() async client | d759525 |
| P1-S02 | 2026-10-14 | Responsive Landing page with hero, GitHub URL validation, and 6-card gallery | a92d043 |
| P1-S03 | 2026-10-17 | WebGL graph canvas with sigma.js, graphology, zoom/pan camera controls, and cleanup | c92a174 |
| P1-S04 | 2026-10-17 | ForceAtlas2 in Web Worker, log2 LOC node sizing, smooth damping, and play/pause | e749b10 |
| P1-S05 | 2026-10-19 | Hover/selection reducers, 1-hop neighbor highlighting, camera gliding, Zustand store | 717e5b6 |
| P1-S06 | 2026-10-20 | Details panel: metric tiles, imports/imported-by tabs, symbol list, neighbor navigation | 41a6925 |
| P1-S07 | 2026-10-21 | Search by path/symbol, cluster and language filter toggles, reducer dimming, match counter | 6810e2c |
| P1-S08 | 2026-10-21 | Pulsing edge flow, active node glow, zoom-based label rules, dev FPS meter | 903b864 |
| P1-S09 | 2026-11-08 | Collapsible chat panel, token streaming simulation, interactive citation chips | pending |
| P1-S10 | 2026-11-08 | Blast radius impact analysis: reverse BFS, depth slider, depth gradient palette, metrics | pending |
| P1-S11 | 2026-11-08 | Color modes (cluster, complexity, churn), dynamic nodeReducer recoloring, adaptive legend | pending |
| P1-S12 | 2026-11-09 | Async states, WebGL recovery, keyboard accessibility, and responsiveness; verification confirmed by Ali | pending |
| P1-S13 | 2026-11-09 | Frontend tests and demo tooling; S13 verification confirmed by Ali | pending |
| P2-S01 | 2026-11-09 | FastAPI factory, validated settings, /health confirmed by Ali; lint, formatting, mypy and 5 tests passed; ADR-016 | pending |
| P2-S02 | 2026-11-09 | Compose services, connection lifecycle, worker placeholder; 18 tests and quality checks pass; live health/shutdown confirmed by Ali | pending |
| P2-S03 | 2026-11-11 | Six PostgreSQL models, async SQLAlchemy sessions, Alembic revision 0001, and live migration and constraint checks; ADR-018 | pending |

## Visual redesign (2026-11-09)

- Ali authorized a cartographic redesign outside the current roadmap step. Rebuilt landing page and shared typography/palette; themed workspace and graph, with matching generator colors. ADR-015 records the design.
- Lint, full TypeScript, and 56 unit tests pass after redesign. Ali subsequently confirmed S12/S13 verification.

## P2-S02 verification (2026-11-09)

- Ali implemented the Docker image, connection manager, FastAPI lifespan, worker placeholder, and Compose services.
- At Ali's request, the AI added connection/lifecycle tests and isolated database/Redis environment variables in fixtures. Runtime application code was unchanged.
- Ruff lint, formatting, strict mypy (17 files), and all 18 tests passed. New tests use simulated clients to cover startup errors, normal shutdown, cleanup failures, cancellation, and worker signal handling.
- Compose configuration validates. Ali confirmed all four services run, /health returns 200, and the worker stops cleanly. Understanding check completed: service-name addressing and health-gated startup.

## P2-S03 verification (2026-11-11)

- Initial revision 0001 was generated from the six model definitions after restoring the Alembic template. The PostgreSQL model check is in `apps/api/tests/postgres_schema_check.py`.
- Ruff, formatting, strict mypy (29 files), and all 18 unit tests passed. Alembic rendered upgrade and downgrade SQL offline. The rendered upgrade includes both composite edge foreign keys.
- Ali confirmed the disposable PostgreSQL upgrade, downgrade, and re-upgrade, live model checks, development upgrade, and /health response.

## Decisions made since the last update

- ADR-018: async SQLAlchemy lifecycle, Alembic migrations, and database-enforced analysis boundaries.
- P2-S01 checks executed successfully on 2026-11-09. Pydantic plugin and explicit pytest-asyncio fixture loop scope fixed the reported tooling issues. Ali requested proceeding directly to the next step.

## Open questions

- None blocking P2-S04. Ali confirmed S12/S13 verification; exact Lighthouse scores and demo evidence were not supplied in chat and are not invented here.

## Known issues and tech debt

- Ali confirmed frontend verification and authorized closing S12/S13. Earlier build and installation blockers are historical; the WebGL import and esbuild permission fixes are implemented.
- Exact accessibility scores and demo artifact location have not been supplied in chat. The earlier verification guide contains historical pending notes; reconcile it with the actual reports when recording detailed evidence.
- Existing architecture gaps outside S12/S13 remain: component-effect graph fetching (TanStack Query planned in P2-S11), timed layout stop without position caching, mock node citations must become validated chunk citations in P3.


## Metrics log (real numbers for resume and README)

| Metric | Value | Measured in step | Date |
|---|---|---|---|
| Indexing: LOC per minute | | | |
| Time to analyze 100k LOC | | | |
| Q&A p50 / p95 latency | | | |
| Retrieval recall@k | | | |
| Citation precision | | | |
| Answer correctness | | | |
| Cost per query | | | |
| Load test: RPS / p95 | | | |
| Backend test coverage | | | |

## Session handoff block

When Ali says `handoff`, the AI replaces this section with a block in this exact format so a fresh session can resume without the chat history:

```
HANDOFF
Date:
Current step: <ID>, stage <A to F>, chunk <n of m>
What was just done:
What is half-done (files touched, uncommitted changes):
Next action:
Decisions made this session (ADR numbers):
Things the next session must not forget:
Commands to verify the current state:
```

Current handoff:

- none
