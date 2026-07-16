/**
 * Curated, super-admin-editable landing content slots. Kept in its own file
 * (no server imports) so the admin UI's client components can import it
 * directly without pulling `rawDb`/Prisma into the browser bundle.
 */
export const EDITABLE_CONTENT_KEYS = [
  "hero.badge",
  "hero.headline1",
  "hero.headline2",
  "hero.subhead",
  "hero.ctaPrimary",
  "hero.ctaSecondary",
  "cta.headline1",
  "cta.headline2",
  "cta.subhead",
  "pricing.disclaimer",
] as const;

export type EditableContentKey = (typeof EDITABLE_CONTENT_KEYS)[number];
