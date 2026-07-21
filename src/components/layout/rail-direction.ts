export type InterfaceDirection = "ltr" | "rtl";
export type RailChevronDirection = "left" | "right";

/**
 * The chevron describes where the rail edge will move after activation.
 * It is deliberately direction-aware instead of mirroring every icon in CSS.
 */
export function getRailChevronDirection(
  direction: InterfaceDirection,
  expanded: boolean,
): RailChevronDirection {
  if (direction === "rtl") return expanded ? "right" : "left";
  return expanded ? "left" : "right";
}
