import type { GraphNode, RepoGraph } from "@/types/graph";

export type ColorMode = "cluster" | "complexity" | "churn";

export interface ColorLegendItem {
  label: string;
  color: string;
  description?: string;
}

export const COMPLEXITY_THRESHOLDS = {
  LOW: 10,
  MODERATE: 25,
} as const;

export const CHURN_THRESHOLDS = {
  LOW: 5,
  MODERATE: 18,
} as const;

/**
 * Returns the node's recorded churn or deterministically derives a mock value
 * based on path character codes and lines of code.
 */
export function resolveNodeChurn(node: GraphNode): number {
  if (typeof node.churn === "number") return node.churn;
  let hash = 0;
  for (let i = 0; i < node.id.length; i++) {
    hash = (hash * 31 + node.id.charCodeAt(i)) % 1000;
  }
  return Math.floor((hash % 28) + (node.loc % 12));
}

/**
 * Returns a 3-tier risk color for cyclomatic complexity.
 */
export function getComplexityColor(complexity: number): string {
  if (complexity <= COMPLEXITY_THRESHOLDS.LOW) return "#10b981"; // Emerald
  if (complexity <= COMPLEXITY_THRESHOLDS.MODERATE) return "#f59e0b"; // Amber
  return "#ef4444"; // Rose
}

/**
 * Returns a 3-tier thermal color for recent git edit velocity.
 */
export function getChurnColor(churn: number): string {
  if (churn <= CHURN_THRESHOLDS.LOW) return "#06b6d4"; // Cyan (calm)
  if (churn <= CHURN_THRESHOLDS.MODERATE) return "#8b5cf6"; // Purple (moderate)
  return "#f43f5e"; // Hot pink/rose (high velocity)
}

/**
 * Resolves the primary fill color of a node according to the active color mode.
 */
export function resolveNodeColor(
  node: GraphNode,
  mode: ColorMode,
  clusterColorMap: Map<string, string>
): string {
  switch (mode) {
    case "complexity":
      return getComplexityColor(node.complexity);
    case "churn":
      return getChurnColor(resolveNodeChurn(node));
    case "cluster":
    default:
      return node.color || clusterColorMap.get(node.cluster) || "#3b82f6";
  }
}

/**
 * Returns human-readable legend entries for the current color mode.
 */
export function getColorModeLegend(
  mode: ColorMode,
  graph: RepoGraph
): ColorLegendItem[] {
  switch (mode) {
    case "complexity":
      return [
        { label: "Low (≤ 10)", color: "#10b981", description: "Straightforward logic" },
        { label: "Moderate (11–25)", color: "#f59e0b", description: "Standard branching" },
        { label: "High (> 25)", color: "#ef4444", description: "Hotspot / refactor candidate" },
      ];
    case "churn":
      return [
        { label: "Stable (≤ 5)", color: "#06b6d4", description: "Rarely modified" },
        { label: "Active (6–18)", color: "#8b5cf6", description: "Moderate recent commits" },
        { label: "High (> 18)", color: "#f43f5e", description: "Frequent recent edits" },
      ];
    case "cluster":
    default:
      return graph.clusters.map((c) => ({
        label: c.name,
        color: c.color,
        description: `${c.nodeCount} files`,
      }));
  }
}
