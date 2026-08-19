import React from 'react';
import { View } from 'react-native';

import type { Calendar, CalendarKind } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Dropdown } from '../../../../shared/ui/Dropdown';
import { Text } from '../../../../shared/ui/Text';

export const UNSET = '';

export type FilterState = { season: string; commodity: string; region: string; district: string; year: string };

export const EMPTY_FILTERS: FilterState = { season: UNSET, commodity: UNSET, region: UNSET, district: UNSET, year: UNSET };

type Props = {
  kind: CalendarKind;
  /** Every calendar of this kind — the options are derived from these, so
   * the app can only ever offer a choice that returns something. */
  calendars: Calendar[];
  value: FilterState;
  onChange: (next: FilterState) => void;
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value.trim().length > 0))].sort();
}

/**
 * Season, crop, region, district — the same four choices the web calendar
 * asks for, in the same order.
 *
 * Two departures from the web version, both deliberate. Region narrows the
 * district list, so a farmer cannot pick a pair that returns nothing. And
 * every option is derived from the calendars actually published rather than
 * from a static catalogue of all 261 districts, which on the web leaves
 * most selections dead: the backend matches these strings exactly, and its
 * region reads "Ashanti Region" where the app's own district list says
 * "Ashanti".
 */
export function CalendarFilters({ kind, calendars, value, onChange }: Props) {
  const theme = useTheme();

  // Poultry has no season: it is uploaded as a single production-cycle
  // sheet with no major/minor split, so offering the choice would be a
  // control that cannot do anything.
  const seasons = kind === 'crop' ? unique(calendars.flatMap((entry) => entry.seasons)) : [];

  const withinSeason = calendars.filter((entry) => value.season === UNSET || entry.seasons.includes(value.season));
  const commodities = unique(withinSeason.map((entry) => entry.commodity));

  const withinCommodity = withinSeason.filter((entry) => value.commodity === UNSET || entry.commodity === value.commodity);
  const regions = unique(withinCommodity.map((entry) => entry.region));

  const withinRegion = withinCommodity.filter((entry) => value.region === UNSET || entry.region === value.region);
  const districts = unique(withinRegion.map((entry) => entry.district));

  const withinDistrict = withinRegion.filter((entry) => value.district === UNSET || entry.district === value.district);
  // Only offered where a year was actually recorded. Calendars uploaded
  // without one — which the live Tomato row is — stay visible under "Any
  // year" rather than being hidden behind a choice they cannot satisfy.
  const years = unique(withinDistrict.map((entry) => (entry.year ? String(entry.year) : ''))).sort((a, b) => b.localeCompare(a));

  const subject = kind === 'crop' ? 'Crop' : 'Bird';

  return (
    <View style={{ gap: theme.spacing.md }}>
      {seasons.length > 0 ? (
        <Dropdown
          label="Season"
          options={[{ id: UNSET, label: 'Select season' }, ...seasons.map((s) => ({ id: s, label: s }))]}
          selectedId={value.season}
          // Clearing what depends on it: a crop valid in the major season
          // may not exist in the minor one, and a stale selection would
          // silently return nothing.
          onSelect={(season) => onChange({ ...EMPTY_FILTERS, season })}
        />
      ) : null}

      <Dropdown
        label={`${subject} type *`}
        options={[{ id: UNSET, label: `Select ${subject.toLowerCase()}` }, ...commodities.map((c) => ({ id: c, label: c }))]}
        selectedId={value.commodity}
        onSelect={(commodity) => onChange({ ...value, commodity, region: UNSET, district: UNSET })}
      />

      <Dropdown
        label="Region *"
        options={[{ id: UNSET, label: 'Select region' }, ...regions.map((r) => ({ id: r, label: r }))]}
        selectedId={value.region}
        onSelect={(region) => onChange({ ...value, region, district: UNSET })}
      />

      <Dropdown
        label="District *"
        options={[{ id: UNSET, label: 'Select district' }, ...districts.map((d) => ({ id: d, label: d }))]}
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

      {!isComplete(value, seasons.length > 0) ? (
        <Text variant="caption" color={theme.colors.warning}>
          Choose {seasons.length > 0 ? 'a season, ' : ''}a {subject.toLowerCase()}, region and district to see the calendar.
        </Text>
      ) : null}
    </View>
  );
}

/** Whether enough has been chosen to show a calendar. Season is required
 * only where it exists — poultry has none. */
export function isComplete(value: FilterState, seasonRequired: boolean): boolean {
  if (seasonRequired && value.season === UNSET) return false;
  return value.commodity !== UNSET && value.region !== UNSET && value.district !== UNSET;
}

export function matchesFilters(entry: Calendar, value: FilterState): boolean {
  if (value.year !== UNSET && String(entry.year ?? '') !== value.year) return false;
  if (value.season !== UNSET && !entry.seasons.includes(value.season)) return false;
  if (value.commodity !== UNSET && entry.commodity !== value.commodity) return false;
  if (value.region !== UNSET && entry.region !== value.region) return false;
  if (value.district !== UNSET && entry.district !== value.district) return false;
  return true;
}
