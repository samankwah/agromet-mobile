/**
 * The stable id for a district, from its name as `ghanaRegions.ts` spells it.
 *
 * Shared by the app and by scripts/build-ghana-boundaries.mjs, so the id on a
 * map polygon and the id alerts are saved under are always the same string.
 * District names are unique across Ghana, so the name alone is enough.
 */
export function districtId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
