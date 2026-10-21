import { create } from "zustand";

export interface GraphState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredNeighbors: Set<string>;
  selectedNeighbors: Set<string>;

  // Filters. Empty cluster/language Sets mean "no restriction", never "nothing matches".
  searchQuery: string;
  clusterFilter: Set<string>;
  languageFilter: Set<string>;
  // Derived: computed by the explore page from the pure filter module and
  // synced in so the sigma reducers can read it. null means "no filter active".
  matchingNodeIds: Set<string> | null;

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

  // Sets are always replaced with a fresh instance, never mutated in place:
  // Zustand compares references, so an in-place mutation would notify nobody.
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
}));
