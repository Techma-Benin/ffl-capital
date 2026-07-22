/** Decorative corner fills for StatCard (viewBox 0 0 200 200, anchored top-right). */
export type StatCardCornerShape = "blob" | "quarter-circle" | "diagonal" | "hexagon";

export const STAT_CARD_GEOMETRIC_CORNER_PATHS: Record<
  Exclude<StatCardCornerShape, "blob">,
  string
> = {
  /** Large arc tucked into the top-right corner. */
  "quarter-circle": "M200,0 L200,158 A158,158 0 0,0 42,0 Z",
  /** Soft diagonal wedge from the top-right. */
  diagonal: "M200,0 L200,200 L76,0 Z",
  /** Flat-top hexagon slice in the corner. */
  hexagon: "M200,0 L200,68 L172,104 L128,104 L100,68 L100,0 Z",
};
