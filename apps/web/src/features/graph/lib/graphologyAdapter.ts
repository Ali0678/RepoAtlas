import Graph from "graphology";
import type { RepoGraph, GraphNode, GraphEdge } from "@/types/graph";

export interface NodeAttributes {
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  cluster: string;
  language: string;
  loc: number;
  complexity: number;
  raw: GraphNode;
}

export interface EdgeAttributes {
  size: number;
  color: string;
  weight: number;
  raw: GraphEdge;
}

/**
 * Calculates a visually balanced node radius from lines of code using logarithmic scaling.
 * Prevents large files from eclipsing small files while maintaining clear visual hierarchy.
 */
export function calculateNodeSize(loc: number): number {
  const safeLoc = Math.max(1, loc);
  // log2(loc) maps 32 LOC -> 5, 256 LOC -> 8, 1024 LOC -> 10
  // Multiplied by 1.4, clamped between 3.5px and 16px
  return Math.max(3.5, Math.min(16, Math.round(Math.log2(safeLoc) * 1.4)));
}

/**
 * Converts a domain RepoGraph into an optimized graphology Graph instance.
 * Enforces logarithmic LOC node sizing, cluster coloring, and referential integrity.
 */
export function createGraphologyFromRepo(repoGraph: RepoGraph): Graph {
  const graph = new Graph({ multi: false, type: "directed" });

  const clusterColors = new Map<string, string>();
  for (const c of repoGraph.clusters) {
    clusterColors.set(c.id, c.color);
  }

  // 1. Add all nodes
  for (const node of repoGraph.nodes) {
    const color = node.color || clusterColors.get(node.cluster) || "#3b82f6";
    const size = calculateNodeSize(node.loc);

    // Initial coordinates required by ForceAtlas2 before simulation starts
    const x =
      typeof node.x === "number" && !isNaN(node.x)
        ? node.x
        : (Math.random() - 0.5) * 500;
    const y =
      typeof node.y === "number" && !isNaN(node.y)
        ? node.y
        : (Math.random() - 0.5) * 500;

    graph.addNode(node.id, {
      label: node.label || node.path,
      x,
      y,
      size,
      color,
      cluster: node.cluster,
      language: node.language,
      loc: node.loc,
      complexity: node.complexity,
      raw: node,
    });
  }

  // 2. Add edges with strict referential validation
  for (const edge of repoGraph.edges) {
    if (edge.source === edge.target) continue;

    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
      continue;
    }

    if (graph.hasEdge(edge.source, edge.target)) {
      continue;
    }

    graph.addEdge(edge.source, edge.target, {
      size: Math.max(0.6, Math.min(2.0, edge.weight * 0.6)),
      color: "#27272a", // Subtle dark gray matching border-subtle
      weight: edge.weight,
      raw: edge,
    });
  }

  return graph;
}
