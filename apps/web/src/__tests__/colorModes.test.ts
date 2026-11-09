import { describe, it, expect } from "vitest";
import {
  getComplexityColor,
  getChurnColor,
  resolveNodeColor,
  resolveNodeChurn,
  COMPLEXITY_THRESHOLDS,
  CHURN_THRESHOLDS,
} from "../features/graph/lib/colorModes";
import type { GraphNode } from "../types/graph";

function makeNode(partial: Partial<GraphNode> & { id: string }): GraphNode {
  return {
    label: partial.id,
    path: `src/${partial.id}.ts`,
    cluster: "c1",
    language: "TypeScript",
    loc: 100,
    complexity: partial.complexity ?? 5,
    size: 10,
    symbols: [],
    ...partial,
  };
}

const CLUSTER_MAP = new Map([["c1", "#a855f7"]]);

describe("getComplexityColor", () => {
  it("returns emerald for low complexity (at boundary)", () => {
    expect(getComplexityColor(COMPLEXITY_THRESHOLDS.LOW)).toBe("#10b981");
  });

  it("returns amber for moderate complexity (at boundary)", () => {
    expect(getComplexityColor(COMPLEXITY_THRESHOLDS.MODERATE)).toBe("#f59e0b");
  });

  it("returns rose for high complexity (above MODERATE threshold)", () => {
    expect(getComplexityColor(COMPLEXITY_THRESHOLDS.MODERATE + 1)).toBe("#ef4444");
  });

  it("returns emerald for complexity 1", () => {
    expect(getComplexityColor(1)).toBe("#10b981");
  });
});

describe("getChurnColor", () => {
  it("returns cyan for low churn (at boundary)", () => {
    expect(getChurnColor(CHURN_THRESHOLDS.LOW)).toBe("#06b6d4");
  });

  it("returns purple for moderate churn (at boundary)", () => {
    expect(getChurnColor(CHURN_THRESHOLDS.MODERATE)).toBe("#8b5cf6");
  });

  it("returns hot pink for high churn (above MODERATE threshold)", () => {
    expect(getChurnColor(CHURN_THRESHOLDS.MODERATE + 1)).toBe("#f43f5e");
  });
});

describe("resolveNodeChurn", () => {
  it("returns the recorded churn when present", () => {
    const node = makeNode({ id: "x", churn: 42 });
    expect(resolveNodeChurn(node)).toBe(42);
  });

  it("returns a deterministic value when churn is undefined", () => {
    const node = makeNode({ id: "deterministic" });
    const a = resolveNodeChurn(node);
    const b = resolveNodeChurn(node);
    expect(a).toBe(b);
  });

  it("returns a non-negative number when churn is undefined", () => {
    const node = makeNode({ id: "noChurn" });
    expect(resolveNodeChurn(node)).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveNodeColor", () => {
  it("uses cluster color in cluster mode", () => {
    const node = makeNode({ id: "n1" });
    const color = resolveNodeColor(node, "cluster", CLUSTER_MAP);
    expect(color).toBe("#a855f7");
  });

  it("falls back to node.color in cluster mode if present", () => {
    const node = makeNode({ id: "n2", color: "#ff0000" });
    expect(resolveNodeColor(node, "cluster", CLUSTER_MAP)).toBe("#ff0000");
  });

  it("uses complexity color in complexity mode", () => {
    const node = makeNode({ id: "n3", complexity: 30 }); // above MODERATE → rose
    expect(resolveNodeColor(node, "complexity", CLUSTER_MAP)).toBe("#ef4444");
  });

  it("uses churn color in churn mode", () => {
    const node = makeNode({ id: "n4", churn: 1 }); // below LOW threshold → cyan
    expect(resolveNodeColor(node, "churn", CLUSTER_MAP)).toBe("#06b6d4");
  });
});
