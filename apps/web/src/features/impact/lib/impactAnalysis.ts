import type { RepoGraph, GraphNode } from "@/types/graph";
import type { BlastRadiusResult, ImpactedNode } from "../types";

export const DEPTH_COLORS = {
  0: "#ef4444", // Target node (rose-500)
  1: "#f97316", // Direct dependent (orange-500)
  2: "#eab308", // Indirect dependent (amber-500)
  3: "#a855f7", // Transitive dependent (violet-500)
} as const;

export function getDepthColor(depth: number): string {
  return DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] ?? "#3b82f6";
}

/**
 * Computes the blast radius of modifying a target file by running a reverse BFS
 * over directed import edges up to maxDepth hops.
 *
 * In our graph model, edge (S -> T) indicates S imports T.
 * Therefore, if T is modified, all nodes S where edge.target === T are directly impacted (depth 1).
 */
export function computeBlastRadius(
  graph: RepoGraph,
  targetNodeId: string,
  maxDepth: number = 2
): BlastRadiusResult | null {
  const targetNode = graph.nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) return null;

  // 1. Build fast reverse adjacency map: target -> array of sources that import it
  const incomingMap = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = incomingMap.get(edge.target);
    if (list) {
      list.push(edge.source);
    } else {
      incomingMap.set(edge.target, [edge.source]);
    }
  }

  const nodeMap = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));

  // 2. Reverse BFS traversal with cycle detection
  const visited = new Set<string>([targetNodeId]);
  const depthMap = new Map<string, number>([[targetNodeId, 0]]);
  const queue: Array<{ id: string; depth: number }> = [{ id: targetNodeId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const dependents = incomingMap.get(current.id) ?? [];
    for (const depId of dependents) {
      if (!visited.has(depId)) {
        visited.add(depId);
        const nextDepth = current.depth + 1;
        depthMap.set(depId, nextDepth);
        queue.push({ id: depId, depth: nextDepth });
      }
    }
  }

  // 3. Group impacted dependents by depth
  const byDepth: Record<number, ImpactedNode[]> = {
    1: [],
    2: [],
    3: [],
  };

  let totalAffectedLoc = 0;
  let totalAffectedFiles = 0;

  for (const [id, depth] of depthMap.entries()) {
    if (depth === 0) continue; // Skip target itself for affected stats
    const node = nodeMap.get(id);
    if (node) {
      totalAffectedFiles += 1;
      totalAffectedLoc += node.loc;
      if (byDepth[depth]) {
        byDepth[depth].push({
          node,
          depth,
          path: node.path,
        });
      }
    }
  }

  // Sort each depth bucket by LOC descending (highest risk first)
  for (const depth of [1, 2, 3]) {
    byDepth[depth].sort((a, b) => b.node.loc - a.node.loc);
  }

  return {
    targetNode,
    maxDepth,
    depthMap,
    byDepth,
    totalAffectedFiles,
    totalAffectedLoc,
  };
}
