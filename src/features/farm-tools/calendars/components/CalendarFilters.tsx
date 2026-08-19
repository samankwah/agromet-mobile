import React from 'react';
import { View } from 'react-native';

import { districtsInRegion, GHANA_REGION_NAMES } from '../../../../shared/data/ghanaRegions';
import type { Calendar, CalendarKind } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Dropdown } from '../../../../shared/ui/Dropdown';
import { Text } from '../../../../shared/ui/Text';

export const UNSET = '';

/**
 * Ghana grows two rain-fed seasons in the south and one long one in the
 * north; calendars are uploaded as a sheet per season and the sheet name
 * is the only record of which. These are the two names the upload
 * templates use, so they are the two a calendar can be filed under.
 */
export const SEASONS = ['Major Season', 'Minor Season'];

/** The birds the backend's poultry catalogue recognises. Unlike crops,
 * this is a closed list — a calendar cannot be filed under a bird that
 * does not exist. */
export const POULTRY_TYPES = ['Broiler', 'Layer', 'Cockerel', 'Duck', 'Turkey', 'Guinea Fowl', 'Goose'];

export type FilterState = { season: string; commodity: string; region: string; district: string; year: string };

export const EMPTY_FILTERS: FilterState = { season: UNSET, commodity: UNSET, region: UNSET, district: UNSET, year: UNSET };

type Props = {
  kind: CalendarKind;
  /** Published calendars — used only to widen the crop list and to offer
   * years, never to narrow where a farmer may look. */
  calendars: Calendar[];
  value: FilterState;
  onChange: (next: FilterState) => void;
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value.trim().length > 0))].sort();
}

/**
 * Season, crop or bird, region, district, year.
 *
 * The place lists are the full national catalogue — 17 regions, 283
 * districts — not just the places that happen to have a calendar today. A
 * farmer in a district with nothing published still needs to find their own
 * district and be told plainly that nothing is there; a list that quietly
 * omitted it would read as though the district did not exist.
 *
 * District still cascades from region, because a district only belongs to
 * one region and offering all 283 at once is unusable on a phone.
 */
export function CalendarFilters({ kind, calendars, value, onChange }: Props) {
  const theme = useTheme();
  const isCrop = kind === 'crop';

  // Crops come from what has been published, plus nothing else to go on —
  // there is no closed national crop list in the backend. Poultry does have
  // one, so it is used whole.
  const published = unique(calendars.map((entry) => entry.commodity));
  const commodities = isCrop ? published : unique([...POULTRY_TYPES, ...published]);

  const districts = value.region === UNSET ? [] : districtsInRegion(value.region);

  // Years are offered only where one was recorded, because a calendar
  // uploaded without a year cannot satisfy a specific-year choice.
  const withinPlace = calendars.filter(
    (entry) =>
      (value.commodity === UNSET || entry.commodity === value.commodity) &&
      (value.region === UNSET || entry.region === value.region) &&
      (value.district === UNSET || entry.district === value.district),
  );
  const years = unique(withinPlace.map((entry) => (entry.year ? String(entry.year) : ''))).sort((a, b) => b.localeCompare(a));

  const subject = isCrop ? 'Crop' : 'Bird';

  return (
    <View style={{ gap: theme.spacing.md }}>
      {/* Poultry is uploaded as a single production-cycle sheet with no
          major/minor split, so the choice would have nothing to act on. */}
      {isCrop ? (
        <Dropdown
          label="Season *"
          options={[{ id: UNSET, label: 'Select season' }, ...SEASONS.map((s) => ({ id: s, label: s }))]}
          selectedId={value.season}
          onSelect={(season) => onChange({ ...value, season })}
        />
      ) : null}

      <Dropdown
        label={`${subject} type *`}
        options={[{ id: UNSET, label: `Select ${subject.toLowerCase()}` }, ...commodities.map((c) => ({ id: c, label: c }))]}
        selectedId={value.commodity}
        onSelect={(commodity) => onChange({ ...value, commodity })}
      />

      <Dropdown
        label="Region *"
        options={[{ id: UNSET, label: 'Select region' }, ...GHANA_REGION_NAMES.map((r) => ({ id: r, label: r }))]}
        selectedId={value.region}
        // A district belongs to exactly one region, so it cannot survive a
        // region change.
        onSelect={(region) => onChange({ ...value, region, district: UNSET, year: UNSET })}
      />

      <Dropdown
        label="District *"
        options={[
          { id: UNSET, label: value.region === UNSET ? 'Select a region first' : 'Select district' },
          ...districts.map((d) => ({ id: d, label: d })),
        ]}
        selectedId={value.district}
        onSelect={(district) => onChange({ ...value, district, year: UNSET })}
      />

      {years.length > 0 ? (
        <Dropdown
          label="Year"
          options={[{ id: UNSET, label: 'Any year' }, ...years.map((y) => ({ id: y, label: y }))]}
          selectedId={value.year}
          onSelect={(year) => onChange({ ...value, year })}
        />
      ) : null}

      {!isComplete(value, isCrop) ? (
        <Text variant="caption" color={theme.colors.warning}>
          Choose {isCrop ? 'a season, a crop' : 'a bird'}, region and district to see the calendar.
        </Text>
      ) : null}
    </View>
  );
}

/** Whether enough has been chosen to look for a calendar. Season applies to
 * crops only — poultry calendars carry no season. */
export function isComplete(value: FilterState, seasonRequired: boolean): boolean {
  if (seasonRequired && value.season === UNSET) return false;
  return value.commodity !== UNSET && value.region !== UNSET && value.district !== UNSET;
}

export function matchesFilters(entry: Calendar, value: FilterState): boolean {
  if (value.year !== UNSET && String(entry.year ?? '') !== value.year) return false;
  // A calendar records the season sheets it was built from. Older uploads
  // may carry none; those are not excluded by a season choice, since the
  // absence is a gap in the upload rather than evidence of the wrong season.
  if (value.season !== UNSET && entry.seasons.length > 0 && !entry.seasons.includes(value.season)) return false;
  if (value.commodity !== UNSET && entry.commodity !== value.commodity) return false;
  if (value.region !== UNSET && entry.region !== value.region) return false;
  if (value.district !== UNSET && entry.district !== value.district) return false;
  return true;
}
