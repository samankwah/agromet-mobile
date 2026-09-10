import { getDistrictById } from '../../../shared/data/districts';
import { formatDriverMeasurement } from '../../../shared/domain/hazard';
import type { HazardBlock, HazardKind, HazardRegion } from '../../../shared/domain/hazard';
import { compareBandDesc, isElevatedBand } from '../../../shared/domain/hazardBand';

/**
 * Pure reads over a hazard summary. Kept out of the components so the ranking
 * and phrasing rules can be tested without rendering anything.
 */

/** Worst first, ties broken by score then name.
 *
 * The name tiebreak is not decoration: without it, two regions on the same
 * score swap places between refreshes and the list appears to shuffle for no
 * reason a reader can see. */
export function rankRegions(regions: HazardRegion[], hazard: HazardKind): HazardRegion[] {
  return [...regions].sort((a, b) => {
    const byBand = compareBandDesc(a[hazard].band, b[hazard].band);
    if (byBand !== 0) return byBand;
    const byScore = (b[hazard].score ?? -1) - (a[hazard].score ?? -1);
    if (byScore !== 0) return byScore;
    return a.region.localeCompare(b.region);
  });
}

export function splitByAttention(regions: HazardRegion[], hazard: HazardKind) {
  const ranked = rankRegions(regions, hazard);
  return {
    attention: ranked.filter((region) => isElevatedBand(region[hazard].band)),
    rest: ranked.filter((region) => !isElevatedBand(region[hazard].band)),
  };
}

/**
 * The measurement doing most of the work in a score.
 *
 * A list of sixteen regions that differ only by a band word tells a reader
 * nothing about *why*. Showing the dominant driver — "heaviest day 28 mm" —
 * turns near-identical rows into distinguishable ones, and it is the same
 * figure the region screen breaks down in full, so the two cannot disagree.
 *
 * Dominance is score times weight: a term can be at 100 and still be a minor
 * contributor if it carries a tenth of the weight.
 */
export function dominantDriver(block: HazardBlock) {
  const usable = block.drivers.filter((driver) => driver.value !== null);
  if (usable.length === 0) return null;
  return usable.reduce((best, driver) =>
    driver.score * driver.weight > best.score * best.weight ? driver : best,
  );
}

/** A short phrase for a list row — the label and value, without the full gloss. */
export function driverSummary(block: HazardBlock): string | null {
  const driver = dominantDriver(block);
  if (!driver || driver.value === null) return null;

  // Rounding and units both live in `formatDriverMeasurement` now, so this row
  // cannot drift from the alert evidence or the drivers list.
  return `${driver.label} ${formatDriverMeasurement(driver.value, driver.unit).text}`;
}

/** The regions covered by the reader's saved districts, worst first. */
export function regionsForDistricts(
  regions: HazardRegion[],
  districtIds: string[],
  hazard: HazardKind,
): { region: HazardRegion; districts: string[] }[] {
  const districtsByRegion = new Map<string, string[]>();

  districtIds.forEach((id) => {
    const district = getDistrictById(id);
    if (!district) return;
    districtsByRegion.set(district.region, [
      ...(districtsByRegion.get(district.region) ?? []),
      district.name,
    ]);
  });

  return rankRegions(
    regions.filter((region) => districtsByRegion.has(region.region)),
    hazard,
  ).map((region) => ({ region, districts: districtsByRegion.get(region.region) ?? [] }));
}
