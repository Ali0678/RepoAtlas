import { create } from "zustand";

export interface GraphState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredNeighbors: Set<string>;
  selectedNeighbors: Set<string>;

  // Actions
  setSelectedNodeId: (id: string | null, neighbors?: string[]) => void;
  setHoveredNodeId: (id: string | null, neighbors?: string[]) => void;
  clearSelection: () => void;
  resetHover: () => void;
}

export const useGraphStore = create<GraphState>()((set) => ({
  selectedNodeId: null,
  hoveredNodeId: null,
  hoveredNeighbors: new Set<string>(),
  selectedNeighbors: new Set<string>(),

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
      selectedNeighbors: new Set(),
    }),

  resetHover: () =>
    set({
      hoveredNodeId: null,
      hoveredNeighbors: new Set(),
    }),
}));
