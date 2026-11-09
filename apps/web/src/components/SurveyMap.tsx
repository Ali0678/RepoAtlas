import Link from "next/link";
import graph from "@/mocks/mock-graph.json";

export function SurveyMap() {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    px: 300 + node.x * 0.65,
    py: 270 + node.y * 0.65,
  }));
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  return (
    <figure className="atlas-map atlas-reveal">
      <Link href="/explore" aria-label="Explore the example dependency map">
        <svg
          viewBox="0 0 620 550"
          role="img"
          aria-label="Mock repository dependency map grouped into six modules"
        >
          <defs>
            <pattern id="survey-grid" width="35" height="35" patternUnits="userSpaceOnUse">
              <path
                d="M35 0H0V35"
                fill="none"
                stroke="#789075"
                strokeOpacity=".13"
                strokeWidth=".5"
              />
            </pattern>
          </defs>
          <rect x="10" y="10" width="600" height="530" fill="url(#survey-grid)" />
          {[100, 175, 250].map((radius) => (
            <circle
              key={radius}
              cx="300"
              cy="270"
              r={radius}
              fill="none"
              stroke="#789075"
              strokeOpacity=".18"
              strokeDasharray="3 7"
            />
          ))}
          <path d="M300 10V530M20 270H600" stroke="#789075" strokeOpacity=".22" />
          {graph.edges.slice(0, 260).map((edge) => {
            const a = lookup.get(edge.source)!;
            const b = lookup.get(edge.target)!;
            return (
              <line key={edge.id} className="map-edge" x1={a.px} y1={a.py} x2={b.px} y2={b.py} />
            );
          })}
          {nodes.map((node) => (
            <circle
              key={node.id}
              className="map-node"
              cx={node.px}
              cy={node.py}
              r={1.5 + node.complexity / 12}
              fill={node.color}
              opacity=".9"
            />
          ))}
          <text x="506" y="225">
            01 / CORE
          </text>
          <text x="405" y="488">
            02 / API
          </text>
          <text x="70" y="488">
            03 / DATA
          </text>
          <text x="16" y="225">
            04 / SERVICES
          </text>
          <text x="66" y="63">
            05 / INTERFACE
          </text>
          <text x="398" y="63">
            06 / UTILITIES
          </text>
          <path d="M568 85V35m-5 8 5-8 5 8" stroke="#f07853" fill="none" />
          <text x="564" y="25">
            N
          </text>
          <text x="23" y="530">
            FIG. 001 — DEPENDENCY TOPOLOGY
          </text>
        </svg>
      </Link>
      <figcaption className="atlas-map-caption atlas-kicker">
        <span>150 files / 6 modules</span>
        <span>Explore the map ↗</span>
      </figcaption>
    </figure>
  );
}
