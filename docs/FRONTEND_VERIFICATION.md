# Frontend S12/S13 verification

## What changed

S12 finishes useful loading/error/empty UI, a WebGL error boundary with retry, file-search shortcuts, keyboard focus trapping/restoration for overlays, a single responsive sidebar, narrow-screen chat, reduced motion, and input labels/errors. Ctrl/Cmd+K opens the mobile sidebar before focusing file search. Escape is handled by the top overlay before underlying panels.

S13 adds component tests for async states and keyboard behavior to the existing four graph/store suites. Chromium smoke tests exercise the actual WebGL canvas, selecting a file through a chat citation, search/reset, color changes, mobile drawer/shortcuts, and chat sizing. Vitest only discovers source unit tests; TypeScript now includes test/config files instead of hiding them from checking.

## Results observed on 2026-11-09

Ali installed the test packages and Chromium. His `pnpm check` passed lint, TypeScript, and all 56 tests, then failed production prerendering because sigma referenced `WebGL2RenderingContext` on the server. Browser smoke/demo startup errors followed from that incomplete build.

Fixed: load GraphCanvas with `next/dynamic` and `ssr: false`, keeping sigma's module initialization in the browser. Also set the interrupted `allowBuilds.esbuild` placeholder to `true`, allowing esbuild's required binary setup script.

After this fix the assistant reran ESLint, full TypeScript, all six Vitest suites (56 tests), and changed-file formatting successfully. Default Turbopack build verification in the assistant sandbox was blocked by a port-binding restriction in the CSS worker. An alternate webpack build also stopped before prerendering because Next could not parse its TypeScript `--showConfig` subprocess output in this session. Production build/prerendering and browser verification still require a successful local rerun.

Lighthouse has not been run and no demo video has been recorded. Neither step is marked complete.

## Run locally

From the project root:

```bash
cd apps/web
pnpm install
pnpm rebuild esbuild
pnpm exec playwright install chromium
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm test:e2e
pnpm test:demo
```

The smoke suite starts the production server automatically. The demo command runs the desktop test with video recording and copies its passing recording to `docs/artifacts/frontend-demo.webm`. Playwright videos/traces from normal runs remain under ignored `apps/web/test-results/`.

For the accessibility audit, start `pnpm start` in one terminal, then in another:

```bash
cd apps/web
pnpm audit:a11y
```

Lighthouse needs an installed Chrome/Chromium. If it cannot detect yours, set `CHROME_PATH` to that executable when running the command. JSON and HTML reports go to `docs/artifacts/lighthouse.report.*`. Record the actual score and unresolved audit findings here. Repeat on `/` with the same Lighthouse options to check the landing page.

Manual checks: use Tab and Shift+Tab inside both overlays, Escape while typing, Ctrl/Cmd+K on desktop/mobile, retry after an error, and chat at 375px width. Confirm no horizontal overflow and that closing an overlay returns focus to its trigger. Lighthouse does not replace these checks or establish complete accessibility by itself.

## Close the steps

After checks pass and Ali confirms: record resolved test dependency versions, save the Lighthouse reports and video, mark S12/S13 complete in ROADMAP and PROGRESS, and set P2-S01 as next. Until then they remain in progress.

Suggested commit after review:

```bash
git add apps/web scripts/record-demo.mjs docs
git commit -m "feat(web): finish frontend states accessibility and smoke tests"
git push
```
