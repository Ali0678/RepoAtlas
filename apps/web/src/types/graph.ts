export type SymbolKind =
  | "function"
  | "class"
  | "interface"
  | "method"
  | "variable"
  | "type";

export interface SymbolInfo {
  id: string;
  name: string;
  kind: SymbolKind;
  startLine: number;
  endLine: number;
  signature?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  cluster: string;
  language: string;
  loc: number;
  complexity: number;
  churn?: number;
  size: number;
  color?: string;
  x?: number;
  y?: number;
  symbols: SymbolInfo[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  kind?: "import" | "call";
}

export interface ClusterInfo {
  id: string;
  name: string;
  color: string;
  nodeCount: number;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  url: string;
  commitSha: string;
  defaultBranch: string;
}

export interface RepoStats {
  totalFiles: number;
  totalLoc: number;
  totalSymbols: number;
  languages: Record<string, number>;
}

export interface RepoGraph {
  repo: RepoMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ClusterInfo[];
  stats: RepoStats;
}