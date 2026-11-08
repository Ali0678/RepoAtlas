import type { RepoGraph, GraphNode } from "@/types/graph";
import type { ParsedContentPart, SuggestedPrompt } from "../types";

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "arch",
    label: "Architecture",
    prompt: "How is the overall repository architecture organized?",
  },
  {
    id: "api",
    label: "API Routing",
    prompt: "Where are the API endpoints and routing handlers located?",
  },
  {
    id: "db",
    label: "Database Models",
    prompt: "How are the database models and data persistence structured?",
  },
  {
    id: "complex",
    label: "Complex Hotspots",
    prompt: "Which modules have the highest complexity and risk?",
  },
];

/**
 * Parses raw text with [cite:nodeId] or [cite:nodeId|label] citation tokens
 * into structured segments for inline interactive rendering.
 */
export function parseMessageContent(content: string): ParsedContentPart[] {
  const parts: ParsedContentPart[] = [];
  const regex = /\[cite:([^\]|]+)(?:\|([^\]]+))?\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        text: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "citation",
      nodeId: match[1].trim(),
      fallbackLabel: match[2]?.trim(),
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      text: content.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * Extracts unique node IDs cited in a message content string.
 */
export function extractCitations(content: string): string[] {
  const regex = /\[cite:([^\]|]+)(?:\|[^\]]+)?\]/g;
  const ids = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1].trim());
  }

  return Array.from(ids);
}

function findClusterNodes(graph: RepoGraph, clusterKey: string): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      n.cluster.toLowerCase() === clusterKey.toLowerCase() ||
      n.path.toLowerCase().includes(clusterKey.toLowerCase())
  );
}

/**
 * Builds a grounded response incorporating actual node citations from the graph.
 */
export function generateMockAnswer(question: string, graph: RepoGraph): string {
  const q = question.toLowerCase();

  // 1. API & Routing
  if (q.includes("api") || q.includes("route") || q.includes("endpoint") || q.includes("handler")) {
    const apiNodes = findClusterNodes(graph, "api");
    const nodeA = apiNodes[0] || graph.nodes[0];
    const nodeB = apiNodes[1] || graph.nodes[1];

    return (
      `The API surface is organized under the **API & Routing** subsystem.\n\n` +
      `HTTP requests enter through [cite:${nodeA.id}|${nodeA.label}], which orchestrates endpoint dispatch and parameter validation. ` +
      `Downstream services and controllers are coordinated through [cite:${nodeB.id}|${nodeB.label}].\n\n` +
      `Key characteristics:\n` +
      `- In-degree: ${apiNodes.length > 0 ? "High connectivity from web clients" : "Standard"}\n` +
      `- Out-degree: Dispatches directly to service and database layers\n` +
      `- Click any citation chip to focus its location on the dependency map.`
    );
  }

  // 2. Database & Models
  if (q.includes("db") || q.includes("database") || q.includes("model") || q.includes("storage") || q.includes("schema")) {
    const dbNodes = findClusterNodes(graph, "db");
    const nodeA = dbNodes[0] || graph.nodes[0];
    const nodeB = dbNodes[1] || graph.nodes[1];

    return (
      `Database models and persistence schemas are encapsulated in the **Database & Models** module.\n\n` +
      `Primary entity declarations are defined in [cite:${nodeA.id}|${nodeA.label}] (${nodeA.loc} LOC), while transaction handling and query builders reside in [cite:${nodeB.id}|${nodeB.label}].\n\n` +
      `Because multiple services import these models, changes here carry a wide blast radius across the dependency graph.`
    );
  }

  // 3. Complexity & Hotspots
  if (q.includes("complex") || q.includes("hotspot") || q.includes("risk") || q.includes("refactor")) {
    const sorted = [...graph.nodes].sort((a, b) => b.complexity - a.complexity);
    const top1 = sorted[0];
    const top2 = sorted[1];
    const top3 = sorted[2];

    return (
      `Analyzing code metrics across ${graph.stats.totalFiles} files reveals the following complexity hotspots:\n\n` +
      `1. [cite:${top1.id}|${top1.label}] - Cyclomatic Complexity: **${top1.complexity}** (${top1.loc} LOC, cluster: \`${top1.cluster}\`)\n` +
      `2. [cite:${top2.id}|${top2.label}] - Cyclomatic Complexity: **${top2.complexity}** (${top2.loc} LOC, cluster: \`${top2.cluster}\`)\n` +
      `3. [cite:${top3.id}|${top3.label}] - Cyclomatic Complexity: **${top3.complexity}** (${top3.loc} LOC, cluster: \`${top3.cluster}\`)\n\n` +
      `These modules contain dense branching logic and represent candidate targets for modular decomposition.`
    );
  }

  // 4. Utilities
  if (q.includes("util") || q.includes("helper") || q.includes("shared") || q.includes("common")) {
    const utilNodes = findClusterNodes(graph, "utils");
    const nodeA = utilNodes[0] || graph.nodes[0];
    const nodeB = utilNodes[1] || graph.nodes[1];

    return (
      `Shared utilities and helper routines are consolidated in the **Utilities** module.\n\n` +
      `Common helpers are implemented in [cite:${nodeA.id}|${nodeA.label}] and [cite:${nodeB.id}|${nodeB.label}]. ` +
      `These modules have high in-degree (imported widely) with minimal outbound dependencies, making them foundational building blocks.`
    );
  }

  // 5. Default / Architecture Overview
  const coreNodes = findClusterNodes(graph, "core");
  const serviceNodes = findClusterNodes(graph, "services");
  const nodeCore = coreNodes[0] || graph.nodes[0];
  const nodeSvc = serviceNodes[0] || graph.nodes[1];

  return (
    `**${graph.repo.owner}/${graph.repo.name}** consists of **${graph.stats.totalFiles}** files across **${graph.clusters.length}** clusters.\n\n` +
    `The core execution engine is anchored by [cite:${nodeCore.id}|${nodeCore.label}], which defines primary system workflows. ` +
    `Business domain services interact via [cite:${nodeSvc.id}|${nodeSvc.label}].\n\n` +
    `You can explore any highlighted file by clicking its citation chip or selecting connected nodes on the WebGL canvas.`
  );
}

/**
 * Async generator that simulates streaming tokens chunk by chunk.
 */
export async function* streamMockAnswer(
  question: string,
  graph: RepoGraph,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const fullText = generateMockAnswer(question, graph);
  const words = fullText.split(/(\s+)/);

  for (let i = 0; i < words.length; i += 2) {
    if (signal?.aborted) return;

    // Bundle word + following whitespace
    const chunk = words[i] + (words[i + 1] ?? "");
    yield chunk;

    // 20ms delay per token simulates ~50 tokens/sec streaming
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
