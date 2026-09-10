/**
 * The published legal documents — Terms of Service and Privacy Policy.
 *
 * Structured sections rather than HTML or markdown: the web app renders these
 * with its own components and this app with native ones, so shipping markup
 * would force one of them to parse it. The backend holds the wording (see
 * `LEGAL_DOCUMENTS` in `backend/app/main.py`) and both clients lay it out their
 * own way, which is what keeps one copy of the text rather than two that drift.
 */

export type LegalSection = {
  title: string;
  body: string;
  /** Bullets under `body`. Absent, not empty, when a section is just prose. */
  items?: string[];
};

export type LegalDocument = {
  slug: LegalSlug;
  title: string;
  summary: string;
  /** Human wording as published, e.g. "April 2026" — not a parseable date. */
  updated: string;
  sections: LegalSection[];
};

/** The slugs the backend serves at `/api/legal/{slug}`. */
export const LEGAL_SLUGS = ['terms', 'privacy'] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}
