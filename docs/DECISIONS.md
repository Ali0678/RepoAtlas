# DECISIONS.md

Architecture Decision Records. Each decision gets a short entry. Initial decisions are `Accepted (initial)`. Ali can change any of them. A change requires a new ADR that supersedes the old one, never a silent edit.

Template:

```
## ADR-NNN: Title
Status: Proposed | Accepted | Superseded by ADR-NNN
Context: why a decision is needed
Decision: what was chosen
Alternatives: what else was considered and why not
Consequences: trade-offs and follow-ups
```

---

## ADR-001: Two apps in one repository
Status: Accepted (initial)
Context: Frontend and backend are developed together by one person and share a contract (the OpenAPI schema).
Decision: One git repository with `apps/web` and `apps/api`. No monorepo build tool.
Alternatives: Two repositories (harder to keep in sync, double CI setup). Turborepo or Nx (unneeded complexity with one JS package).
Consequences: One place for docs and issues. CI runs both apps with path filters.

## ADR-002: Next.js App Router with TypeScript strict
Status: Accepted (initial)
Context: Need a modern, widely used full-stack frontend framework that employers recognize.
Decision: Next.js with the App Router, React, TypeScript strict mode, Tailwind CSS.
Alternatives: Vite + React (simpler, but weaker on the hiring signal and deployment story). Remix, SvelteKit (smaller job market).
Consequences: Server and client component boundaries must be understood. The graph canvas is a client component.

## ADR-003: sigma.js and graphology for the graph
Status: Accepted (initial)
Context: Graphs can reach thousands of nodes and need smooth interaction.
Decision: sigma.js (WebGL) with graphology for the data structure and layout algorithms.
Alternatives: d3-force with SVG (slows down past a few hundred nodes). Cytoscape.js (canvas, heavier styling model). react-force-graph (less control over reducers and layout).
Consequences: Highlighting is done through reducers. The canvas lives outside React's render cycle.

## ADR-004: FastAPI with Python for the backend
Status: Accepted (initial)
Context: AI tooling, parsing libraries, and the author's skills all favor Python.
Decision: FastAPI, async, Pydantic v2, SQLAlchemy 2 async.
Alternatives: Node/Express or NestJS (a single language across the stack, but weaker AI ecosystem).
Consequences: Two languages in the repo. The OpenAPI schema becomes the typed bridge to the frontend.

## ADR-005: PostgreSQL with pgvector instead of a dedicated vector database
Status: Accepted (initial)
Context: Vectors, relational data, and full-text search are all needed and are always filtered by analysis.
Decision: One Postgres instance with pgvector and `tsvector`.
Alternatives: Pinecone, Qdrant, Weaviate (extra service, extra cost, more moving parts, no transactional consistency with the rest of the data).
Consequences: Hybrid search lives in SQL. Revisit only if a single analysis outgrows what one index handles well.

## ADR-006: ARQ for background jobs
Status: Accepted (initial)
Context: Analysis is slow and CPU and I/O heavy and must not block the API.
Decision: ARQ with Redis.
Alternatives: Celery (more features, heavier, sync-first). RQ (sync only). Dramatiq.
Consequences: Async-native workers, Redis is already in the stack. Fewer features than Celery, enough for this project.

## ADR-007: tree-sitter for parsing
Status: Accepted (initial)
Context: Need symbols and imports across languages without running code.
Decision: tree-sitter with Python and TypeScript/JavaScript grammars.
Alternatives: Python `ast` module (Python only). Regex (fragile). Language servers (heavy, may execute project tooling).
Consequences: Grammar and binding versions must be pinned and verified. Adding a language means adding a grammar and a query set.

## ADR-008: SSE for streaming, with POST for the ask endpoint
Status: Accepted (initial)
Context: Progress updates and token streams flow server to client only.
Decision: Server-Sent Events. Progress uses GET with `EventSource`. Q&A uses POST returning `text/event-stream`, read with `fetch` streaming because `EventSource` is GET-only.
Alternatives: WebSockets (bidirectional, unneeded here, harder to scale and proxy).
Consequences: A small stream parser on the client for the POST case.

## ADR-009: Hybrid retrieval with Reciprocal Rank Fusion
Status: Accepted (initial)
Context: Code queries mix exact identifiers (keyword wins) and concepts (semantic wins).
Decision: Full-text plus vector search merged with RRF (k = 60), optional rerank measured by the eval harness.
Alternatives: Vector only (misses exact names). Keyword only (misses concepts).
Consequences: Two queries per question. Fusion logic is unit-testable.

## ADR-010: File-level graph nodes
Status: Accepted (initial)
Context: Symbol-level graphs are noisy and expensive to resolve correctly across languages.
Decision: Nodes are files, edges are imports. Symbols are stored per file for search and detail.
Alternatives: Symbol-level call graph (stretch goal).
Consequences: Impact analysis is file-level in the MVP. Symbol-level caller lookup is heuristic and labeled approximate.

## ADR-011: Embedding model
Status: Proposed (decide in P3-S01)
Context: Anthropic does not provide an embedding model. Need one that handles code reasonably, with a fixed dimension.
Decision: To be made in P3-S01 after comparing options on cost, quality on code, dimension, and latency. Default candidate: a local open-source embedding model.
Alternatives: Voyage AI, OpenAI embeddings, other hosted providers.
Consequences: The vector dimension in the `chunks` table depends on this. Changing models later requires re-embedding.

## ADR-012: Authentication with GitHub OAuth and Redis-backed sessions
Status: Accepted (initial)
Context: Users are developers, GitHub identity is natural, and the API and web app are separate origins in development.
Decision: GitHub OAuth, a server-side session stored in Redis, an httpOnly cookie holding only the session ID.
Alternatives: JWT access and refresh tokens (stateless, but revocation and rotation add complexity, and a Redis session teaches more about the infrastructure already in use).
Consequences: Logout and revocation are immediate. CSRF protection is required. Revisit JWT only if a non-browser client appears.

## ADR-013: Model usage tiers
Status: Proposed (decide in P3-S04)
Context: Cost and quality differ by task.
Decision: To be made in P3-S04 using the current model list in the official Anthropic docs. Direction: smaller model for summaries and bulk work, stronger model for Q&A and agent.
Consequences: Model IDs live in config, never hardcoded in logic.
