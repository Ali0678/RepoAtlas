# PROJECT_BRIEF.md

## Name and tagline

**RepoAtlas**: an interactive map of any codebase, with AI that answers questions about it and shows you where the answer lives.

## Problem

Developers joining or auditing an unfamiliar repository spend hours reading files to build a mental model: what the modules are, how they connect, where a feature lives, what breaks if something changes. Existing tools are either static text (README, grep) or generic chat over code with no spatial context.

## Users

- Developers onboarding to a new repository.
- Reviewers estimating the blast radius of a change.
- Students studying well-known open-source projects.
- Recruiters and engineers evaluating this portfolio piece (they must be able to try it in under 30 seconds, with no login, via the gallery).

## Core features (MVP)

1. **Analyze a public GitHub repo** by URL. Shallow clone, parse, build a dependency graph.
2. **Interactive graph**: WebGL rendering, zoom, pan, hover highlight, click for details, search, filters by folder and language, cluster coloring, animated edges.
3. **Color modes**: by cluster, by complexity (and by churn if the stretch step is done).
4. **Ask questions**: natural-language Q&A over the repo with streamed answers and citations. Each citation highlights its file or symbol on the graph.
5. **Impact analysis**: select a file or symbol and see its dependents highlighted by depth, plus an AI explanation of the risk.
6. **Architecture overview**: AI-generated summary of the repo and its modules, cached per commit.
7. **Public gallery**: 5 to 8 pre-analyzed famous repositories, viewable without login.
8. **Auth**: GitHub OAuth. Anonymous users can view the gallery only.
9. **Eval suite**: a reproducible benchmark (40 or more questions across 3 pinned repos) with published scores.

## Stretch features (only after MVP is deployed)

- Commit-history timeline replay and churn heat overlay.
- 3D mode (React Three Fiber).
- Symbol-level call graph.
- Louvain community detection for clusters.
- Incremental re-indexing for changed files.
- Additional languages (Go, Java).

## Non-goals

Private repositories, running or building analyzed code, code editing or PR generation, team features, billing, mobile app, self-hosted LLMs, microservices, Kubernetes.

## 60-second demo script

1. Open the landing page. Click a gallery repo. The graph animates in, clustered by module.
2. Hover and click nodes. Side panel shows file details.
3. Switch color mode to complexity. Hotspots appear.
4. Ask "Where is authentication handled?" Answer streams, cited files glow on the map.
5. Select a core file, run impact analysis. Dependents ripple outward by depth.
6. Paste a new repo URL. Progress streams live. The new graph appears.

## Visual direction

- Dark theme, high contrast, restrained palette. Cluster colors from an accessible categorical palette. Subtle glow on selection, no clutter.
- Smooth 60 fps interaction on graphs up to about 5,000 nodes.
- Typography: one sans-serif for UI, one monospace for code and paths.
- Motion has purpose: layout transitions, camera moves, edge flow on selection. No decorative animation that slows the canvas.

## Success metrics (these become resume bullets; record real numbers in PROGRESS.md)

- Indexing throughput: lines of code processed per minute, and time to analyze a 100k-line repo.
- Query latency: p50 and p95 for Q&A time to first token and full answer.
- Eval results: answer correctness %, citation precision %, retrieval recall@k on the 40-question set.
- Cost per query and cache hit rate.
- Load test: requests per second and p95 latency under N concurrent users.
- Test coverage on backend core modules.

## Definition of done for the project

- Deployed with a public URL and a working no-login gallery.
- CI green: lint, type-check, unit tests, E2E smoke.
- README with architecture diagram, setup instructions, eval table, load-test table.
- 60-second demo video.
- All ADRs written. All roadmap steps ticked or explicitly descoped via ADR.
