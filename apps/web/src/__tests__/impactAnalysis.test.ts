import { describe, it, expect } from "vitest";
import {
  computeBlastRadius,
  getDepthColor,
  DEPTH_COLORS,
} from "../features/impact/lib/impactAnalysis";
import type { RepoGraph } from "../types/graph";

// Minimal RepoGraph fixture:
//   A --> B --> D
//        |
//        v
//        C
//
// If we change D (target), then B imports D (depth 1), A imports B (depth 2).
// C imports B but is depth 1 from B; with D as target, C is depth 2.
function makeGraph(): RepoGraph {
  const makeNode = (id: string) => ({
    id,
    label: id,
    path: `src/${id}.ts`,
    cluster: "c1",
    language: "TypeScript",
    loc: 50,
    complexity: 3,
    size: 5,
    symbols: [],
  });

  return {
    repo: {
      owner: "test",
      name: "repo",
      url: "https://github.com/test/repo",
      commitSha: "abc123",
      defaultBranch: "main",
    },
    nodes: [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")],
    // Edge means "source imports target"
    edges: [
      { id: "e1", source: "A", target: "B", weight: 1 },
      { id: "e2", source: "B", target: "D", weight: 1 },
      { id: "e3", source: "C", target: "B", weight: 1 },
    ],
    clusters: [{ id: "c1", name: "Core", color: "#3b82f6", nodeCount: 4 }],
    stats: { totalFiles: 4, totalLoc: 200, totalSymbols: 0, languages: { TypeScript: 4 } },
  };
}

describe("computeBlastRadius", () => {
  it("returns null for an unknown target node", () => {
    expect(computeBlastRadius(makeGraph(), "NONEXISTENT")).toBeNull();
  });

  it("includes target at depth 0", () => {
    const result = computeBlastRadius(makeGraph(), "D", 2);
    expect(result).not.toBeNull();
    expect(result!.depthMap.get("D")).toBe(0);
  });

  it("includes direct importers at depth 1", () => {
    const result = computeBlastRadius(makeGraph(), "D", 2)!;
    // B imports D → B should be at depth 1
    expect(result.depthMap.get("B")).toBe(1);
  });

  it("includes transitive importers at depth 2", () => {
    const result = computeBlastRadius(makeGraph(), "D", 2)!;
    // A imports B, C imports B → both at depth 2
    expect(result.depthMap.get("A")).toBe(2);
    expect(result.depthMap.get("C")).toBe(2);
  });

  it("respects maxDepth=1 and does not traverse further", () => {
    const result = computeBlastRadius(makeGraph(), "D", 1)!;
    expect(result.depthMap.has("A")).toBe(false);
    expect(result.depthMap.has("C")).toBe(false);
  });

  it("counts totalAffectedFiles excluding the target", () => {
    const result = computeBlastRadius(makeGraph(), "D", 2)!;
    // B, A, C are affected = 3 files
    expect(result.totalAffectedFiles).toBe(3);
  });

  it("does not revisit nodes (cycle safety)", () => {
    // Add a back edge D->A to create a cycle; BFS should still terminate
    const g = makeGraph();
    g.edges.push({ id: "cycle", source: "D", target: "A", weight: 1 });
    const result = computeBlastRadius(g, "D", 3);
    expect(result).not.toBeNull();
    // Should complete without infinite loop; D is at depth 0
    expect(result!.depthMap.get("D")).toBe(0);
  });
});

describe("getDepthColor", () => {
  it("returns the correct color for each depth 0-3", () => {
    expect(getDepthColor(0)).toBe(DEPTH_COLORS[0]);
    expect(getDepthColor(1)).toBe(DEPTH_COLORS[1]);
    expect(getDepthColor(2)).toBe(DEPTH_COLORS[2]);
    expect(getDepthColor(3)).toBe(DEPTH_COLORS[3]);
  });

  it("falls back to blue for unknown depths", () => {
    expect(getDepthColor(99)).toBe("#3b82f6");
  });
});
