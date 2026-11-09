import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "apps/web");
const result = spawnSync(
  "pnpm",
  ["test:e2e", "--grep", "demo:", "--retries=0"],
  {
    cwd: web,
    stdio: "inherit",
    shell: false,
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const results = path.join(web, "test-results");
const folder = readdirSync(results).find((name) => name.includes("demo-"));
if (!folder) throw new Error("Passing demo test did not produce a recording.");
const artifacts = path.join(root, "docs/artifacts");
mkdirSync(artifacts, { recursive: true });
copyFileSync(
  path.join(results, folder, "video.webm"),
  path.join(artifacts, "frontend-demo.webm"),
);
console.log("Saved docs/artifacts/frontend-demo.webm");
