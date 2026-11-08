import type { GraphNode } from "@/types/graph";

export type ImpactDepth = 1 | 2 | 3;

export interface ImpactedNode {
  node: GraphNode;
  depth: number; // 0 for target, 1 for direct dependent, 2 for indirect, 3 for transitive
  path: string;
}

export interface BlastRadiusResult {
  targetNode: GraphNode;
  maxDepth: number;
  depthMap: Map<string, number>;
  byDepth: Record<number, ImpactedNode[]>;
  totalAffectedFiles: number;
  totalAffectedLoc: number;
}
