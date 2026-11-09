"use client";

import * as React from "react";
import { GraphErrorState } from "./GraphErrorState";

// A data request can succeed even when the browser cannot initialize WebGL.
export class GraphBoundary extends React.Component<
  {
    children: React.ReactNode;
    onRetry: () => void;
  },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <GraphErrorState message={this.state.error} onRetry={this.props.onRetry} />
    ) : (
      this.props.children
    );
  }
}
