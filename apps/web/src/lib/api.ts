import mockGraphData from "@/mocks/mock-graph.json";
import type { RepoGraph } from "@/types/graph";

/**
 * Fetches the dependency graph for a specific analysis.
 *
 * In Phase 1, this returns typed mock data with a simulated async latency.
 * In Phase 2 (P2-S11), this will be swapped to fetch from `GET /api/v1/analyses/{id}/graph`.
 */
export async function getGraph(analysisId: string): Promise<RepoGraph> {
  // Simulate network latency (150ms) so loading spinners and async hooks behave realistically
  await new Promise((resolve) => setTimeout(resolve, 150));

  if (!analysisId) {
    throw new Error("Analysis ID is required to fetch repository graph.");
  }

  return mockGraphData as unknown as RepoGraph;
}