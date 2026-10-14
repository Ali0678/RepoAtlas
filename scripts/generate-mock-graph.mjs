import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, "../apps/web/src/mocks/mock-graph.json");

const CLUSTERS = [
  { id: "core", name: "Core Engine", color: "#3b82f6", prefix: "src/core" },
  { id: "api", name: "API & Routing", color: "#10b981", prefix: "src/api" },
  { id: "db", name: "Database & Models", color: "#8b5cf6", prefix: "src/db" },
  { id: "services", name: "Services", color: "#f59e0b", prefix: "src/services" },
  { id: "ui", name: "UI Components", color: "#ec4899", prefix: "src/ui" },
  { id: "utils", name: "Utilities", color: "#06b6d4", prefix: "src/utils" },
];

const NODES_PER_CLUSTER = 25; // 6 * 25 = 150 total nodes
const nodes = [];
const nodeMap = new Map();

for (let cIdx = 0; cIdx < CLUSTERS.length; cIdx++) {
  const cluster = CLUSTERS[cIdx];
  const angle = (cIdx / CLUSTERS.length) * 2 * Math.PI;
  const clusterCenterX = Math.cos(angle) * 300;
  const clusterCenterY = Math.sin(angle) * 300;

  for (let i = 0; i < NODES_PER_CLUSTER; i++) {
    const name = `${cluster.id}_module_${String(i + 1).padStart(2, "0")}`;
    const ext = i % 5 === 0 ? "py" : "ts";
    const filePath = `${cluster.prefix}/${name}.${ext}`;
    const loc = Math.floor(40 + Math.random() * 450);
    const complexity = Math.floor(1 + (loc / 500) * 25 + Math.random() * 5);
    const size = Math.max(3, Math.min(14, Math.round(Math.log2(loc)) * 1.3));

    const symbols = [
      { id: `${filePath}#init`, name: `init_${name}`, kind: "function", startLine: 5, endLine: 25 },
      { id: `${filePath}#Handler`, name: `${cluster.id.toUpperCase()}Handler_${i}`, kind: "class", startLine: 30, endLine: loc },
    ];

    const node = {
      id: filePath,
      label: `${name}.${ext}`,
      path: filePath,
      cluster: cluster.id,
      language: ext === "py" ? "python" : "typescript",
      loc,
      complexity,
      size,
      color: cluster.color,
      x: clusterCenterX + (Math.random() - 0.5) * 120,
      y: clusterCenterY + (Math.random() - 0.5) * 120,
      symbols,
    };

    nodes.push(node);
    nodeMap.set(filePath, node);
  }
}

const edges = [];
const edgeSet = new Set();
let edgeCounter = 0;

function addEdge(sourceId, targetId, weight = 1) {
  if (sourceId === targetId) return;
  const key = `${sourceId}->${targetId}`;
  if (edgeSet.has(key)) return;
  if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return;
  edgeSet.add(key);
  edges.push({
    id: `e_${++edgeCounter}`,
    source: sourceId,
    target: targetId,
    weight,
    kind: "import",
  });
}

// 1. Dense intra-cluster dependencies (modules in same directory depend on each other)
for (const node of nodes) {
  const sameCluster = nodes.filter((n) => n.cluster === node.cluster && n.id !== node.id);
  const targetCount = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < targetCount; k++) {
    const target = sameCluster[Math.floor(Math.random() * sameCluster.length)];
    if (target) addEdge(node.id, target.id);
  }
}

// 2. Hub dependencies (most modules import utils and core)
const utilsNodes = nodes.filter((n) => n.cluster === "utils");
const coreNodes = nodes.filter((n) => n.cluster === "core");
for (const node of nodes) {
  if (node.cluster !== "utils" && Math.random() < 0.6) {
    const target = utilsNodes[Math.floor(Math.random() * utilsNodes.length)];
    if (target) addEdge(node.id, target.id, 2);
  }
  if (node.cluster !== "core" && Math.random() < 0.4) {
    const target = coreNodes[Math.floor(Math.random() * coreNodes.length)];
    if (target) addEdge(node.id, target.id, 2);
  }
}

// 3. Multi-tier architectural flow (api -> services -> db)
const apiNodes = nodes.filter((n) => n.cluster === "api");
const serviceNodes = nodes.filter((n) => n.cluster === "services");
const dbNodes = nodes.filter((n) => n.cluster === "db");
for (const apiNode of apiNodes) {
  const svc = serviceNodes[Math.floor(Math.random() * serviceNodes.length)];
  if (svc) addEdge(apiNode.id, svc.id, 3);
}
for (const svcNode of serviceNodes) {
  const db = dbNodes[Math.floor(Math.random() * dbNodes.length)];
  if (db) addEdge(svcNode.id, db.id, 3);
}

const totalLoc = nodes.reduce((acc, n) => acc + n.loc, 0);
const totalSymbols = nodes.reduce((acc, n) => acc + n.symbols.length, 0);
const languages = nodes.reduce((acc, n) => {
  acc[n.language] = (acc[n.language] || 0) + 1;
  return acc;
}, {});

const repoGraph = {
  repo: {
    owner: "torvalds",
    name: "linux",
    url: "https://github.com/torvalds/linux",
    commitSha: "8f67823a1094bc920f01de960579e2a73ef59841",
    defaultBranch: "master",
  },
  nodes,
  edges,
  clusters: CLUSTERS.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    nodeCount: NODES_PER_CLUSTER,
  })),
  stats: {
    totalFiles: nodes.length,
    totalLoc,
    totalSymbols,
    languages,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(repoGraph, null, 2), "utf8");
console.log(`Generated mock graph at ${outputPath}`);
console.log(`Nodes: ${nodes.length}, Edges: ${edges.length}, Clusters: ${CLUSTERS.length}`);