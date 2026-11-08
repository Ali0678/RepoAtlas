import { create } from "zustand";
import type { ColorMode } from "@/features/graph/lib/colorModes";

export interface GraphState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredNeighbors: Set<string>;
  selectedNeighbors: Set<string>;

  // Filters. Empty cluster/language Sets mean "no restriction", never "nothing matches".
  searchQuery: string;
  clusterFilter: Set<string>;
  languageFilter: Set<string>;
  matchingNodeIds: Set<string> | null;

  // Impact Mode: Blast Radius Traversal
  impactTargetId: string | null;
  impactDepth: number; // 1, 2, or 3 hops
  impactedNodes: Map<string, number>; // nodeId -> depth (0: target, 1: direct, etc.)

  // Color Mode
  colorMode: ColorMode;

  // Actions
  setSelectedNodeId: (id: string | null, neighbors?: string[]) => void;
  setHoveredNodeId: (id: string | null, neighbors?: string[]) => void;
  clearSelection: () => void;
  resetHover: () => void;
  setSearchQuery: (query: string) => void;
  toggleClusterFilter: (clusterId: string) => void;
  toggleLanguageFilter: (language: string) => void;
  setMatchingNodeIds: (ids: Set<string> | null) => void;
  clearFilters: () => void;

  // Impact Actions
  setImpactTarget: (id: string | null, depthMap?: Map<string, number>) => void;
  setImpactDepth: (depth: number) => void;
  setImpactedNodes: (map: Map<string, number>) => void;
  clearImpactMode: () => void;

  // Color Mode Actions
  setColorMode: (mode: ColorMode) => void;
}

export const useGraphStore = create<GraphState>()((set) => ({
  selectedNodeId: null,
  hoveredNodeId: null,
  hoveredNeighbors: new Set<string>(),
  selectedNeighbors: new Set<string>(),

  searchQuery: "",
  clusterFilter: new Set<string>(),
  languageFilter: new Set<string>(),
  matchingNodeIds: null,

  impactTargetId: null,
  impactDepth: 2,
  impactedNodes: new Map<string, number>(),

  colorMode: "cluster",

  setSelectedNodeId: (id, neighbors = []) =>
    set({
      selectedNodeId: id,
      selectedNeighbors: new Set(neighbors),
    }),

  setHoveredNodeId: (id, neighbors = []) =>
    set({
      hoveredNodeId: id,
      hoveredNeighbors: new Set(neighbors),
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedNeighbors: new Set<string>(),
    }),

  resetHover: () =>
    set({
      hoveredNodeId: null,
      hoveredNeighbors: new Set<string>(),
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleClusterFilter: (clusterId) =>
    set((state) => {
      const next = new Set(state.clusterFilter);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return { clusterFilter: next };
    }),

  toggleLanguageFilter: (language) =>
    set((state) => {
      const next = new Set(state.languageFilter);
      if (next.has(language)) {
        next.delete(language);
      } else {
        next.add(language);
      }
      return { languageFilter: next };
    }),

  setMatchingNodeIds: (ids) => set({ matchingNodeIds: ids }),

  clearFilters: () =>
    set({
      searchQuery: "",
      clusterFilter: new Set<string>(),
      languageFilter: new Set<string>(),
      matchingNodeIds: null,
    }),

  setImpactTarget: (id, depthMap = new Map()) =>
    set({
      impactTargetId: id,
      impactedNodes: depthMap,
    }),

  setImpactDepth: (depth) => set({ impactDepth: depth }),

  setImpactedNodes: (map) => set({ impactedNodes: map }),

  clearImpactMode: () =>
    set({
      impactTargetId: null,
      impactedNodes: new Map<string, number>(),
    }),

  setColorMode: (mode) => set({ colorMode: mode }),
}));
