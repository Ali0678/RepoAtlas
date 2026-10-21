import type { GraphNode } from "@/types/graph";

export interface GraphFilterCriteria {
  query: string;
  clusters: Set<string>;
  languages: Set<string>;
}

/**
 * Returns true when at least one restriction is set. Callers treat an inactive
 * filter as "everything matches" and skip filtering work entirely.
 * Convention: an empty cluster or language Set means "no restriction", never "nothing matches".
 */
export function isFilterActive({
  query,
  clusters,
  languages,
}: GraphFilterCriteria): boolean {
  return query.trim() !== "" || clusters.size > 0 || languages.size > 0;
}

/**
 * Case-insensitive substring match against the file path (which contains the
 * file name label) and every symbol name defined in the file.
 */
function nodeMatchesQuery(node: GraphNode, normalizedQuery: string): boolean {
  if (node.path.toLowerCase().includes(normalizedQuery)) return true;
  return node.symbols.some((symbol) =>
    symbol.name.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Computes the set of node ids matching all active criteria
 * (query AND cluster AND language, never OR).
 * Returns null when no filter is active, so reducers can skip membership
 * checks entirely and the graph renders exactly as before this feature existed.
 */
export function computeMatchingNodeIds(
  nodes: GraphNode[],
  criteria: GraphFilterCriteria
): Set<string> | null {
  if (!isFilterActive(criteria)) return null;

  const normalizedQuery = criteria.query.trim().toLowerCase();
  const matches = new Set<string>();

  for (const node of nodes) {
    if (criteria.clusters.size > 0 && !criteria.clusters.has(node.cluster)) {
      continue;
    }
    if (
      criteria.languages.size > 0 &&
      !criteria.languages.has(node.language)
    ) {
      continue;
    }
    if (normalizedQuery !== "" && !nodeMatchesQuery(node, normalizedQuery)) {
      continue;
    }
    matches.add(node.id);
  }

  return matches;
}
