import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "../store/useGraphStore";

// Reset store to initial state before each test so tests don't bleed into each other.
beforeEach(() => {
  useGraphStore.setState({
    selectedNodeId: null,
    hoveredNodeId: null,
    hoveredNeighbors: new Set(),
    selectedNeighbors: new Set(),
    searchQuery: "",
    clusterFilter: new Set(),
    languageFilter: new Set(),
    matchingNodeIds: null,
    impactTargetId: null,
    impactDepth: 2,
    impactedNodes: new Map(),
    colorMode: "cluster",
  });
});

describe("useGraphStore — selection", () => {
  it("sets selectedNodeId and neighbors", () => {
    useGraphStore.getState().setSelectedNodeId("node-1", ["node-2", "node-3"]);
    const s = useGraphStore.getState();
    expect(s.selectedNodeId).toBe("node-1");
    expect(s.selectedNeighbors.has("node-2")).toBe(true);
    expect(s.selectedNeighbors.has("node-3")).toBe(true);
  });

  it("clearSelection resets selectedNodeId and neighbors", () => {
    useGraphStore.getState().setSelectedNodeId("node-1", ["node-2"]);
    useGraphStore.getState().clearSelection();
    const s = useGraphStore.getState();
    expect(s.selectedNodeId).toBeNull();
    expect(s.selectedNeighbors.size).toBe(0);
  });
});

describe("useGraphStore — hover", () => {
  it("sets hoveredNodeId and hoveredNeighbors", () => {
    useGraphStore.getState().setHoveredNodeId("node-5", ["node-6"]);
    const s = useGraphStore.getState();
    expect(s.hoveredNodeId).toBe("node-5");
    expect(s.hoveredNeighbors.has("node-6")).toBe(true);
  });

  it("resetHover clears hover state", () => {
    useGraphStore.getState().setHoveredNodeId("node-5", ["node-6"]);
    useGraphStore.getState().resetHover();
    const s = useGraphStore.getState();
    expect(s.hoveredNodeId).toBeNull();
    expect(s.hoveredNeighbors.size).toBe(0);
  });
});

describe("useGraphStore — filters", () => {
  it("setSearchQuery updates searchQuery", () => {
    useGraphStore.getState().setSearchQuery("auth");
    expect(useGraphStore.getState().searchQuery).toBe("auth");
  });

  it("toggleClusterFilter adds cluster when absent", () => {
    useGraphStore.getState().toggleClusterFilter("api");
    expect(useGraphStore.getState().clusterFilter.has("api")).toBe(true);
  });

  it("toggleClusterFilter removes cluster when present", () => {
    useGraphStore.getState().toggleClusterFilter("api");
    useGraphStore.getState().toggleClusterFilter("api");
    expect(useGraphStore.getState().clusterFilter.has("api")).toBe(false);
  });

  it("toggleLanguageFilter adds language when absent", () => {
    useGraphStore.getState().toggleLanguageFilter("Python");
    expect(useGraphStore.getState().languageFilter.has("Python")).toBe(true);
  });

  it("clearFilters resets all filter fields", () => {
    useGraphStore.getState().setSearchQuery("hello");
    useGraphStore.getState().toggleClusterFilter("auth");
    useGraphStore.getState().toggleLanguageFilter("Python");
    useGraphStore.getState().setMatchingNodeIds(new Set(["a", "b"]));
    useGraphStore.getState().clearFilters();
    const s = useGraphStore.getState();
    expect(s.searchQuery).toBe("");
    expect(s.clusterFilter.size).toBe(0);
    expect(s.languageFilter.size).toBe(0);
    expect(s.matchingNodeIds).toBeNull();
  });
});

describe("useGraphStore — impact mode", () => {
  it("setImpactTarget sets target and depthMap", () => {
    const depthMap = new Map([
      ["n1", 0],
      ["n2", 1],
    ]);
    useGraphStore.getState().setImpactTarget("n1", depthMap);
    const s = useGraphStore.getState();
    expect(s.impactTargetId).toBe("n1");
    expect(s.impactedNodes.get("n2")).toBe(1);
  });

  it("clearImpactMode resets impact state", () => {
    useGraphStore.getState().setImpactTarget("n1", new Map([["n1", 0]]));
    useGraphStore.getState().clearImpactMode();
    const s = useGraphStore.getState();
    expect(s.impactTargetId).toBeNull();
    expect(s.impactedNodes.size).toBe(0);
  });

  it("setImpactDepth updates impactDepth", () => {
    useGraphStore.getState().setImpactDepth(3);
    expect(useGraphStore.getState().impactDepth).toBe(3);
  });
});

describe("useGraphStore — color mode", () => {
  it("setColorMode updates colorMode", () => {
    useGraphStore.getState().setColorMode("complexity");
    expect(useGraphStore.getState().colorMode).toBe("complexity");
  });

  it("default colorMode is cluster", () => {
    expect(useGraphStore.getState().colorMode).toBe("cluster");
  });
});
