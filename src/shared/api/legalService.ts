import type { LegalDocument, LegalSection, LegalSlug } from '../domain/legal';
import { getJson } from './http';

/**
 * A legal document from the backend.
 *
 * Like the FAQ endpoint, `/api/legal/{slug}` answers a flat envelope with no
 * `data` key, so `http.ts`'s `unwrap()` leaves it alone and the fields arrive at
 * the top level. See `faqService.ts` for the same quirk.
 */
type LegalDto = {
  success?: boolean;
  slug?: string;
  title?: string;
  summary?: string;
  updated?: string;
  sections?: { title?: string; body?: string; items?: string[] | null }[];
};

/**
 * Drops anything malformed rather than rendering a blank section.
 *
 * A section with no title and no body is a hole in a legal document — worse
 * than one fewer section, because it reads as though the app lost the text.
 */
function toSection(raw: LegalDto['sections'] extends (infer T)[] | undefined ? T : never): LegalSection | null {
  const title = raw?.title?.trim() ?? '';
  const body = raw?.body?.trim() ?? '';
  if (!title && !body) return null;

  const items = (raw?.items ?? []).map((item) => item.trim()).filter((item) => item !== '');

  return { title, body, ...(items.length > 0 ? { items } : null) };
}

export async function fetchLegalDocument(slug: LegalSlug): Promise<LegalDocument> {
  const dto = await getJson<LegalDto>(`/api/legal/${encodeURIComponent(slug)}`);

  const sections = (dto?.sections ?? [])
    .map(toSection)
    .filter((section): section is LegalSection => section !== null);

  // A document with no readable sections is a failure, not an empty success.
  // `useCachedQuery` writes every success to the offline cache, so returning an
  // empty document here would overwrite terms the farmer already had with
  // nothing — the same trap `listFaqs` guards against.
  if (sections.length === 0) {
    throw new Error('That document has not been published yet.');
  }

  return {
    slug,
    title: dto?.title?.trim() || 'Legal',
    summary: dto?.summary?.trim() ?? '',
    updated: dto?.updated?.trim() ?? '',
    sections,
  };
}
