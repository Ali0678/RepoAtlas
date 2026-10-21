const TAU = Math.PI * 2;

/**
 * Animation speed in radians per millisecond. One full pulse cycle (TAU)
 * takes about 1.2 seconds, slow enough to read as energy, fast enough to
 * be obviously alive.
 */
export const FLOW_SPEED_PER_MS = TAU / 1200;

/**
 * Deterministic 0..TAU phase offset for an id, so each edge pulses with its
 * own rhythm instead of every edge blinking in unison. A char-code hash is
 * not cryptographic, but it is stable across frames, which is all animation
 * needs.
 */
export function phaseOffsetFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  }
  return (hash / 9973) * TAU;
}

/**
 * Maps an animation phase (radians) to a 0..1 intensity. sin gives a smooth
 * wave; (sin + 1) / 2 normalizes it. The result is clamped defensively so a
 * floating point overshoot can never push a color interpolation out of range.
 */
export function pulseIntensity(phase: number, offset = 0): number {
  const raw = (Math.sin(phase + offset) + 1) / 2;
  return Math.min(1, Math.max(0, raw));
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * Linear interpolation between two #rrggbb colors. t is clamped to 0..1 so
 * callers can pass a pulse intensity straight through. Returns rgb() because
 * that is what sigma's color parser accepts.
 */
export function interpolateColor(
  from: string,
  to: string,
  t: number
): string {
  const clamped = Math.min(1, Math.max(0, t));
  const a = parseHex(from);
  const b = parseHex(to);
  const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
  const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
  const bl = Math.round(a[2] + (b[2] - a[2]) * clamped);
  return `rgb(${r}, ${g}, ${bl})`;
}
