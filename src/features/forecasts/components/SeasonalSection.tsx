import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { buildSeasonalOutlook, pickBlock, readingText, readyFrom, regionCell } from '../../../shared/api/seasonalService';
import { HOME_LOCATIONS } from '../../../shared/data/mockWeather';
import type {
  SeasonKey,
  SeasonalOutlook,
  SeasonalOutlookSet,
  SeasonalReading,
  SeasonalVariableId,
  SeasonalView,
  WindowKey,
} from '../../../shared/domain/seasonalOutlook';
import {
  SEASONAL_VARIABLES,
  SEASON_KEYS,
  SEASON_LABELS,
  VARIABLE_INFO,
  WINDOW_KEYS,
  isSeasonVariable,
  sectorOf,
} from '../../../shared/domain/seasonalOutlook';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { tint } from '../../../shared/theme/blend';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { ChoroplethMap } from '../../../shared/ui/ChoroplethMap';
import { ColorScaleLegend } from '../../../shared/ui/ColorScaleLegend';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { DetailRow } from '../../../shared/ui/DetailRow';
import { Divider } from '../../../shared/ui/Divider';
import { Drawer } from '../../../shared/ui/Drawer';
import { Dropdown } from '../../../shared/ui/Dropdown';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import { MapLibreChoropleth, type MapSelection } from '../../../shared/ui/MapLibreChoropleth';
import { SectionHeading } from '../../../shared/ui/SectionHeading';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { BAND_COUNT, TERCILE_BOUNDS } from '../../../shared/utils/tercilePalette';
import { deterministicRange } from '../subseasonal/cells';
import {
  buildSeasonalCells,
  categoryLabels,
  hasDryWindow,
  hasProbabilities,
  paletteForVariable,
  stopsFor,
  valueFormatFor,
} from '../seasonal/cells';
import { SpatialOutlookSkeleton, SubseasonalOutlookSkeleton } from './ForecastSkeletons';

type Props = {
  set: SeasonalOutlookSet | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
  /** The reader's own town, for the card in the drawer. */
  locationId: string;
};

/** Matches the Subseasonal segment's map, so switching timescales does not
 * resize the country under the reader. */
const MAP_HEIGHT = 520;

const VIEW_SEGMENTS = ['Probability', 'Deterministic'];
const VIEWS: SeasonalView[] = ['probability', 'deterministic'];

const VARIABLE_OPTIONS = SEASONAL_VARIABLES.map((id) => ({ id, label: VARIABLE_INFO[id].label }));
const SEASON_OPTIONS = SEASON_KEYS.map((id) => ({ id, label: SEASON_LABELS[id] }));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-03" -> "3 Oct 2026". Parsed by hand, because `new Date()` on a bare
 * date reads it as UTC midnight and can print the day before west of Greenwich. */
function formatRunDate(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : null;
}

/** The season the reader most likely farms: their own half of the country. */
function homeSeason(locationId: string): SeasonKey {
  const place = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  return place && sectorOf(place.region) === 'north' ? 'northern' : 'southern-major';
}

/**
 * The seasonal outlook, as a map of Ghana.
 *
 * The same shape as the Subseasonal segment beside it: map first, controls and
 * the reader's own town in a bottom drawer. What is different, and why:
 *
 * - **Seven variables, worked out from daily rain.** Onset, cessation and the
 *   two dry spells belong to a rainy season, so they come with a SEASON choice
 *   (Northern Single, Southern Major, Southern Minor), and each season paints
 *   only its own half of the country. Rainfall total, rainy days and temperature
 *   come with the fixed MAM, MJJ and JAS windows instead.
 * - **Beyond the model's reach.** SEAS5 sees about seven months ahead. For a
 *   season further off the map paints the 30-year normal, and a banner that
 *   cannot be scrolled away says it is the normal, not a forecast, and when the
 *   forecast will be ready.
 * - **No geography control.** The payload is one reading per region.
 * - **A published forecast can be in force.** Then the map shows it, a notice
 *   says who issued it, and the town card adds what the model alone reads.
 */
export function SeasonalSection({ set, status, error, onRetry, locationId }: Props) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [variable, setVariable] = useState<SeasonalVariableId>('onset');
  const [seasonKey, setSeasonKey] = useState<SeasonKey>(() => homeSeason(locationId));
  const [windowKey, setWindowKey] = useState<WindowKey>('MAM');
  const [selection, setSelection] = useState<MapSelection | null>(null);

  const isSeason = isSeasonVariable(variable);
  const block = useMemo(() => (set ? pickBlock(set, variable, seasonKey, windowKey) : undefined), [set, variable, seasonKey, windowKey]);
  const blockCells = useMemo(() => block?.cells ?? [], [block]);
  const blockLabel = block ? `${block.label} ${block.year}` : isSeason ? SEASON_LABELS[seasonKey] : windowKey;
  const ready = useMemo(() => readyFrom(block, variable), [block, variable]);
  const normalOnly = ready !== null;

  const anyProbabilities = useMemo(() => hasProbabilities(blockCells, variable), [blockCells, variable]);
  // Null until the reader chooses, so the default follows the data.
  const view = VIEWS[viewIndex ?? (anyProbabilities ? 0 : 1)];
  const isProbability = view === 'probability' && !normalOnly;
  const valueFormat = valueFormatFor(variable);
  const stops = stopsFor(variable);
  const palette = paletteForVariable(variable);
  const unit = VARIABLE_INFO[variable].unit;

  const cells = useMemo(
    () => buildSeasonalCells(blockCells, variable, isProbability ? 'probability' : 'deterministic'),
    [blockCells, variable, isProbability],
  );
  const range = useMemo(() => deterministicRange(cells), [cells]);
  const min = isProbability ? 0 : range.min;
  const max = isProbability ? BAND_COUNT - 1 : range.max;

  const unavailable = !set || set.unavailable;
  const isEmpty = unavailable || cells.length === 0;
  // A refresh already running outranks the failure before it: the reader has
  // nothing to do but wait, and the query is polling for them.
  const computing = Boolean(set?.computing);
  const fetchFailed = Boolean(set?.fetchFailed);
  const showsDryNote = !isEmpty && isProbability && hasDryWindow(blockCells, variable);

  // The town card is a slice of the set already in hand, so it follows the
  // controls without a second request. It still gets its own error state: a
  // town whose region has no reading must not blank a healthy map.
  const town = useMemo((): { outlook?: SeasonalOutlook; error?: unknown } => {
    if (!set) return {};
    try {
      return { outlook: buildSeasonalOutlook(set, locationId, variable, seasonKey, windowKey) };
    } catch (caught) {
      return { error: caught };
    }
  }, [set, locationId, variable, seasonKey, windowKey]);

  const handleSelect = useCallback((next: MapSelection) => {
    setSelection(next);
    setDrawerExpanded(true);
  }, []);
  const handleDismiss = useCallback(() => setDrawerExpanded(false), []);

  const legend = isEmpty ? null : (
    <View style={{ gap: theme.spacing.sm }}>
      {normalOnly ? <NormalOnlyBanner readyFrom={ready} /> : null}
      <ColorScaleLegend
        min={min}
        max={max}
        unit={isProbability ? '' : unit}
        mode={isProbability ? 'tercile' : 'continuous'}
        valueFormat={valueFormat}
        categories={isProbability ? palette : undefined}
        bounds={isProbability ? TERCILE_BOUNDS : undefined}
        stops={stops}
        unitPlacement="value"
      />
    </View>
  );

  const runDate = set?.runDate ? formatRunDate(set.runDate) : null;
  const selectedReading = selection?.region ? regionCell(block, selection.region)?.[variable] : undefined;

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<SpatialOutlookSkeleton />}>
      {/* The empty state replaces the map, never the drawer, so the controls
          that might get the reader out of it stay in reach. */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {isEmpty ? (
            <EmptyState
              icon={computing ? 'time-outline' : fetchFailed ? 'cloud-offline-outline' : 'calendar-outline'}
              title={
                computing
                  ? 'Getting the outlook ready'
                  : fetchFailed
                    ? 'The weather service did not answer'
                    : !unavailable && isProbability
                      ? 'No chances worked out for this yet'
                      : 'No seasonal outlook has been computed yet'
              }
              message={
                computing
                  ? 'The seasonal outlook takes a little while to build. This will fill in on its own.'
                  : fetchFailed
                    ? 'The seasonal outlook could not be fetched. Try again in a moment. The Today and 7-Day forecasts are unaffected.'
                    : !unavailable && isProbability
                      ? 'The long-term record for this is not ready yet. The deterministic forecast is ready now.'
                      : 'The seasonal outlook could not be computed. The Today and 7-Day forecasts are unaffected.'
              }
            >
              {/* No button while it is being prepared: the query is already
                  polling. */}
              {computing ? null : fetchFailed ? (
                <Button label="Try again" variant="outline" onPress={onRetry} />
              ) : !unavailable && isProbability ? (
                <Button
                  label="Show the deterministic forecast"
                  variant="outline"
                  onPress={() => setViewIndex(VIEWS.indexOf('deterministic'))}
                />
              ) : null}
            </EmptyState>
          ) : isOnline ? (
            <MapLibreChoropleth
              cells={cells}
              min={min}
              max={max}
              geography="region"
              height={MAP_HEIGHT}
              isTercile={isProbability}
              palette={isProbability ? palette : undefined}
              variableLabel={VARIABLE_INFO[variable].label}
              valueFormat={valueFormat}
              onSelect={handleSelect}
              onDismiss={handleDismiss}
              stops={stops}
              selected={selection}
            />
          ) : (
            <ChoroplethMap
              cells={cells}
              min={min}
              max={max}
              geography="region"
              height={MAP_HEIGHT}
              isTercile={isProbability}
              palette={isProbability ? palette : undefined}
              stops={stops}
            />
          )}
        </View>

        <Drawer expanded={drawerExpanded} onExpandedChange={setDrawerExpanded} persistentContent={legend}>
          <View style={{ gap: theme.spacing.lg }}>
            {set?.source === 'gmet' && !unavailable ? <PublishedNotice issuedBy={set.issuedBy} /> : null}

            {isEmpty || !selection?.region ? null : (
              <RegionDetail
                region={selection.region}
                reading={selectedReading}
                variable={variable}
                label={blockLabel}
                onClear={() => setSelection(null)}
              />
            )}

            {/* The same selector style as the Subseasonal drawer: a caps label
                over a full-width control, one row each. */}
            <View>
              <FieldLabel>VIEW</FieldLabel>
              <SegmentedControl
                segments={VIEW_SEGMENTS}
                selectedIndex={VIEWS.indexOf(view)}
                onChange={setViewIndex}
                accessibilityLabel="Forecast view"
                equalWidth
              />
            </View>

            {/* Seven variables are too many for a pill row, so a dropdown. */}
            <Dropdown
              label="VARIABLE"
              options={VARIABLE_OPTIONS}
              selectedId={variable}
              onSelect={(id) => setVariable(id as SeasonalVariableId)}
            />

            {isSeason ? (
              <Dropdown label="SEASON" options={SEASON_OPTIONS} selectedId={seasonKey} onSelect={(id) => setSeasonKey(id as SeasonKey)} />
            ) : (
              <View>
                <FieldLabel>SEASON</FieldLabel>
                <SegmentedControl
                  segments={WINDOW_KEYS}
                  selectedIndex={WINDOW_KEYS.indexOf(windowKey)}
                  onChange={(index) => setWindowKey(WINDOW_KEYS[index])}
                  accessibilityLabel="Three-month window"
                  equalWidth
                />
              </View>
            )}

            {block ? (
              <Text variant="caption" muted>
                {isSeason
                  ? `${blockLabel}. ${seasonKey === 'northern' ? 'Covers the five northern regions.' : 'Covers the eleven southern regions.'}`
                  : `${blockLabel}, all regions.`}
              </Text>
            ) : null}

            {/* Hidden while the whole outlook is missing: the map's own empty
                state already says why. */}
            {unavailable ? null : (
              <AsyncStateView
                status={status === 'pending' ? 'pending' : town.error ? 'error' : 'success'}
                error={town.error}
                onRetry={onRetry}
                skeleton={<SubseasonalOutlookSkeleton />}
              >
                {town.outlook ? <TownGuidance outlook={town.outlook} /> : null}
              </AsyncStateView>
            )}

            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                Shown by region. The seasonal forecast is too coarse for district detail.
              </Text>

              {showsDryNote ? (
                <Text variant="caption" muted>
                  Regions in their dry season show as No signal. Little rain falls there in these months, so there is no rainfall outlook.
                </Text>
              ) : null}

              {isSeason ? (
                <Text variant="caption" muted>
                  The rains start on the first 3 days with 20 mm or more and no dry spell over 7 days in the next month. A dry day has under
                  1 mm of rain.
                </Text>
              ) : null}

              {/* A probabilistic outlook never travels without its uncertainty
                  note. */}
              <Text variant="caption" muted>
                A guide to the season, not a day-to-day forecast. Use it to plan, and follow the Today and 7-Day sections for what to do
                this week.
              </Text>

              {set?.stale ? (
                <Text variant="caption" muted>
                  This is the last outlook that was made. A newer one is on its way.
                </Text>
              ) : null}

              {set ? (
                <Text variant="caption" muted>
                  {set.model} · baseline {set.baseline ?? 'unknown'}
                  {runDate ? `\nForecast made ${runDate}` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Drawer>
      </View>
    </AsyncStateView>
  );
}

/**
 * Says the map is the normal, not a forecast, and when the forecast comes.
 *
 * Lives beside the legend, which the drawer never scrolls away, because a map
 * of normals that looked like a forecast would be the worst mistake this screen
 * could make.
 */
function NormalOnlyBanner({ readyFrom: month }: { readyFrom: string | null }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        padding: theme.spacing.sm,
        borderRadius: theme.radii.md,
        backgroundColor: tint(theme.colors.warning, theme.colors.surface, 0.12),
      }}
    >
      <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
      <Text variant="caption" style={{ flex: 1 }}>
        <Text variant="caption" style={{ fontWeight: '700' }}>
          Normal, not a forecast.
        </Text>{' '}
        The forecast for this season will be ready from {month}.
      </Text>
    </View>
  );
}

/**
 * Says a published forecast is what the map shows.
 *
 * Styled like the hazard screen's bulletin notice. Worded as "issued by", never
 * as if the issuer published this app: it did not.
 */
function PublishedNotice({ issuedBy }: { issuedBy: string | null }) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.xs, backgroundColor: tint(theme.colors.accent, theme.colors.surface, 0.08) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="document-text-outline" size={18} color={theme.colors.accent} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          Published seasonal forecast
        </Text>
      </View>
      <Text variant="caption" muted>
        {issuedBy ? `Issued by ${issuedBy}` : 'A published forecast is shown in place of the model.'}
      </Text>
    </Card>
  );
}

/** The tapped region's figures: what the colour under the reader's finger means. */
function RegionDetail({
  region,
  reading,
  variable,
  label,
  onClear,
}: {
  region: string;
  reading: SeasonalReading | undefined;
  variable: SeasonalVariableId;
  label: string;
  onClear: () => void;
}) {
  const theme = useTheme();
  const info = VARIABLE_INFO[variable];
  const [belowLabel, normalLabel, aboveLabel] = categoryLabels(variable);
  const forecast = reading ? readingText(reading, 'value') : null;
  const normal = reading ? readingText(reading, 'normal') : null;
  const split = reading?.available && reading.probabilities && !reading.dryWindow ? reading.probabilities : null;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="location-outline" size={18} color={theme.colors.muted} />
        <Text variant="h2" style={{ flex: 1 }} numberOfLines={2}>
          {region}
        </Text>
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={`Close ${region} details`} hitSlop={12}>
          {/* Chrome on a nested View, never the Pressable: Android drops it. */}
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={theme.colors.muted} />
          </View>
        </Pressable>
      </View>

      {!reading ? (
        <Text variant="caption" muted>
          {isSeasonVariable(variable)
            ? `${region} does not have the ${label}. Choose ${sectorOf(region) === 'north' ? 'the Northern Single Season' : 'a southern season'} to see it.`
            : `There is no outlook for ${region} in ${label}.`}
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <SectionHeading title={info.label} subtitle={label} />
            {split && reading.confidence ? <ConfidenceBadge level={reading.confidence} /> : null}
          </View>
          <Card style={{ gap: theme.spacing.sm }}>
            {reading.available && forecast ? <DetailRow label="Forecast" value={forecast} /> : null}
            {normal ? <DetailRow label="Normal (1995 to 2024)" value={normal} /> : null}
            {split ? (
              <>
                <Divider />
                <DetailRow label={belowLabel} value={pct(split.below)} />
                <DetailRow label={normalLabel} value={pct(split.normal)} />
                <DetailRow label={aboveLabel} value={pct(split.above)} />
              </>
            ) : null}
          </Card>
          <Text variant="caption" muted>
            {!reading.available
              ? 'Normal, not a forecast. This season is too far ahead for the model yet.'
              : reading.dryWindow
                ? `This is the dry season in ${region}, so there is no rainfall outlook for these months.`
                : split
                  ? `Out of ${reading.members} forecast runs.`
                  : `The middle of ${reading.members} forecast runs. There is no long-term record here yet to compare it with.`}
          </Text>
        </>
      )}
    </View>
  );
}

/** Shares are stored as fractions and read as whole percents. */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** What this season means where the reader actually is. */
function TownGuidance({ outlook }: { outlook: SeasonalOutlook }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <Text variant="h3" style={{ flexShrink: 1 }}>
          {outlook.townName}, {outlook.region}
        </Text>
        {outlook.confidenceLevel ? <ConfidenceBadge level={outlook.confidenceLevel} /> : null}
      </View>

      <Text variant="body" muted>
        {outlook.plainLanguageSummary}
      </Text>
      {outlook.modelSummary ? (
        <Text variant="caption" muted>
          {outlook.modelSummary}
        </Text>
      ) : null}
    </View>
  );
}
