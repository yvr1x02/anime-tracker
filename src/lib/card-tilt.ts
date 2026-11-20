export const MAX_TILT_DEGREES = 6;

type Box = { left: number; top: number; width: number; height: number };

/**
 * Tilt towards the pointer (docs/DESIGN.md, "Come si compongono le trasformazioni"): flat at the centre,
 * MAX_TILT_DEGREES at the edges. The edge nearest the pointer moves back, so the card turns to face it.
 */
export function cardTilt(x: number, y: number, box: Box): { rx: number; ry: number } {
  const clamp = (value: number) => Math.min(0.5, Math.max(-0.5, value));
  const fromCentreX = clamp((x - box.left) / box.width - 0.5);
  const fromCentreY = clamp((y - box.top) / box.height - 0.5);
  return {
    rx: -fromCentreY * 2 * MAX_TILT_DEGREES,
    ry: fromCentreX * 2 * MAX_TILT_DEGREES,
  };
}
