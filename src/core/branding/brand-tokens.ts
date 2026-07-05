/**
 * Brand token generation for white-label theming.
 *
 * A tenant picks a brand hue (and optional chroma/radius); we regenerate the
 * OKLCH `--brand-*` ramp keeping the platform's lightness/chroma structure so
 * contrast and the design language stay intact across any hue. The result is
 * injected as CSS custom properties on the app shell, overriding the defaults
 * in tokens.css.
 */

export interface Branding {
  /** OKLCH hue 0–360. Default petrol ≈ 193. */
  hue: number;
  /** Chroma multiplier 0.5–1.5 (1 = default vividness). */
  chroma: number;
  /** Base radius in rem (0.25–0.75). */
  radius: number;
}

export const DEFAULT_BRANDING: Branding = {
  hue: 193,
  chroma: 1,
  radius: 0.375,
};

// Lightness / chroma structure of the default ramp (see tokens.css).
const RAMP: Array<{ step: number; l: number; c: number }> = [
  { step: 50, l: 0.97, c: 0.012 },
  { step: 100, l: 0.93, c: 0.025 },
  { step: 200, l: 0.87, c: 0.045 },
  { step: 300, l: 0.78, c: 0.065 },
  { step: 400, l: 0.66, c: 0.08 },
  { step: 500, l: 0.55, c: 0.088 },
  { step: 600, l: 0.46, c: 0.082 },
  { step: 700, l: 0.39, c: 0.07 },
  { step: 800, l: 0.32, c: 0.055 },
  { step: 900, l: 0.26, c: 0.042 },
  { step: 950, l: 0.19, c: 0.03 },
];

export function normalizeBranding(input?: Partial<Branding> | null): Branding {
  return {
    hue: clamp(input?.hue ?? DEFAULT_BRANDING.hue, 0, 360),
    chroma: clamp(input?.chroma ?? DEFAULT_BRANDING.chroma, 0.5, 1.5),
    radius: clamp(input?.radius ?? DEFAULT_BRANDING.radius, 0.25, 0.75),
  };
}

/** Build the CSS custom-property declarations for a branding config. */
export function brandTokenCss(branding: Branding): string {
  const b = normalizeBranding(branding);
  const lines = RAMP.map(
    ({ step, l, c }) =>
      `--brand-${step}: oklch(${l} ${(c * b.chroma).toFixed(4)} ${b.hue});`,
  );
  lines.push(`--radius-unit: ${b.radius}rem;`);
  return lines.join(" ");
}

/** Is this branding different from the platform default? */
export function isCustomBranding(branding: Branding): boolean {
  const b = normalizeBranding(branding);
  return (
    b.hue !== DEFAULT_BRANDING.hue ||
    b.chroma !== DEFAULT_BRANDING.chroma ||
    b.radius !== DEFAULT_BRANDING.radius
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
