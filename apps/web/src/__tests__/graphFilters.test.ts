import { describe, it, expect } from "vitest";
import { isFilterActive, computeMatchingNodeIds } from "../features/graph/lib/graphFilters";
import type { GraphNode } from "../types/graph";

// Minimal node factory. Only the fields used by graphFilters are needed.
function makeNode(partial: Partial<GraphNode> & { id: string }): GraphNode {
  return {
    label: partial.id,
    path: partial.path ?? `src/${partial.id}.ts`,
    cluster: partial.cluster ?? "cluster-a",
    language: partial.language ?? "TypeScript",
    loc: 100,
    complexity: 5,
    size: 10,
    symbols: partial.symbols ?? [],
    ...partial,
  };
}

const nodeA = makeNode({
  id: "a",
  path: "src/auth/login.ts",
  cluster: "auth",
  language: "TypeScript",
});
const nodeB = makeNode({
  id: "b",
  path: "src/api/users.ts",
  cluster: "api",
  language: "TypeScript",
});
const nodeC = makeNode({
  id: "c",
  path: "src/utils/format.py",
  cluster: "utils",
  language: "Python",
  symbols: [{ id: "s1", name: "formatDate", kind: "function", startLine: 1, endLine: 5 }],
});

const NODES = [nodeA, nodeB, nodeC];

describe("isFilterActive", () => {
  it("returns false when query is empty and both filter sets are empty", () => {
    expect(isFilterActive({ query: "", clusters: new Set(), languages: new Set() })).toBe(false);
  });

  it("returns false for whitespace-only query", () => {
    expect(isFilterActive({ query: "   ", clusters: new Set(), languages: new Set() })).toBe(false);
  });

  it("returns true when query has content", () => {
    expect(isFilterActive({ query: "auth", clusters: new Set(), languages: new Set() })).toBe(true);
  });

  it("returns true when cluster set is non-empty", () => {
    expect(isFilterActive({ query: "", clusters: new Set(["auth"]), languages: new Set() })).toBe(
      true
    );
  });

  it("returns true when language set is non-empty", () => {
    expect(isFilterActive({ query: "", clusters: new Set(), languages: new Set(["Python"]) })).toBe(
      true
    );
  });
});

describe("computeMatchingNodeIds", () => {
  it("returns null when no filter is active", () => {
    expect(
      computeMatchingNodeIds(NODES, { query: "", clusters: new Set(), languages: new Set() })
    ).toBeNull();
  });

  it("matches nodes by path substring (case-insensitive)", () => {
    const result = computeMatchingNodeIds(NODES, {
      query: "AUTH",
      clusters: new Set(),
      languages: new Set(),
    });
    expect(result).not.toBeNull();
    expect(result!.has("a")).toBe(true);
    expect(result!.has("b")).toBe(false);
  });

  it("matches nodes by symbol name", () => {
    const result = computeMatchingNodeIds(NODES, {
      query: "formatdate",
      clusters: new Set(),
      languages: new Set(),
    });
    expect(result!.has("c")).toBe(true);
    expect(result!.size).toBe(1);
  });

  it("filters by cluster", () => {
    const result = computeMatchingNodeIds(NODES, {
      query: "",
      clusters: new Set(["api"]),
      languages: new Set(),
    });
    expect(result!.has("b")).toBe(true);
    expect(result!.has("a")).toBe(false);
  });

  it("filters by language", () => {
    const result = computeMatchingNodeIds(NODES, {
      query: "",
      clusters: new Set(),
      languages: new Set(["Python"]),
    });
    expect(result!.has("c")).toBe(true);
    expect(result!.size).toBe(1);
  });

  it("applies query AND cluster together (intersection, not union)", () => {
    // Cluster = auth, query = "users" — no node satisfies both
    const result = computeMatchingNodeIds(NODES, {
      query: "users",
      clusters: new Set(["auth"]),
      languages: new Set(),
    });
    expect(result!.size).toBe(0);
  });

  it("returns all nodes when query matches all and no other filter set", () => {
    // "src" appears in every path
    const result = computeMatchingNodeIds(NODES, {
      query: "src",
      clusters: new Set(),
      languages: new Set(),
    });
    expect(result!.size).toBe(3);
  });
});
