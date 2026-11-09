import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExplorePage from "@/app/explore/page";
import { getGraph } from "@/lib/api";
import data from "@/mocks/mock-graph.json";
import type { RepoGraph } from "@/types/graph";
import { useGraphStore } from "@/store/useGraphStore";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ getGraph: vi.fn() }));
vi.mock("@/features/graph/components/GraphCanvas", () => ({
  GraphCanvas: () => <div>Graph ready</div>,
}));
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
  useGraphStore.setState(useGraphStore.getInitialState());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows loading until the request completes", async () => {
  let resolve!: (value: RepoGraph) => void;
  vi.mocked(getGraph).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  render(<ExplorePage />);
  expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Loading graph");
  resolve(data as RepoGraph);
  await screen.findByText("Graph ready");
});

it("recovers from a failed request through Retry", async () => {
  vi.mocked(getGraph)
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce(data as RepoGraph);
  render(<ExplorePage />);
  await screen.findByText("Offline");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Graph ready");
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("shows an empty repository without creating a canvas", async () => {
  vi.mocked(getGraph).mockResolvedValueOnce({ ...data, nodes: [] } as RepoGraph);
  render(<ExplorePage />);
  await screen.findByRole("status", { name: "No files found" });
  expect(screen.queryByText("Graph ready")).toBeNull();
});
