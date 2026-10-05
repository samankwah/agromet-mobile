import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { buildSeasonalOutlook, pickBlock, readyFrom } from '../../../shared/api/seasonalService';
import { SEASON_WINDOWS, seasonsOf } from '../../../shared/domain/seasonalAdvice';
import type {
  SeasonChoice,
  SeasonalOutlook,
  VariableChoice,
  SeasonalOutlookSet,
  SeasonalVariableId,
  SeasonalView,
  WindowKey,
} from '../../../shared/domain/seasonalOutlook';
import {
  ALL_SEASONS_LABEL,
  ALL_VARIABLES_LABEL,
  SEASONAL_VARIABLES,
  SEASON_KEYS,
  SEASON_LABELS,
  VARIABLE_INFO,
  WINDOW_KEYS,
  isSeasonVariable,
  mainSeasonOf,
  sectorOf,
} from '../../../shared/domain/seasonalOutlook';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { tint } from '../../../shared/theme/blend';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Button } from '../../../shared/ui/Button';
import { ChoroplethMap } from '../../../shared/ui/ChoroplethMap';
import { ColorScaleLegend } from '../../../shared/ui/ColorScaleLegend';
import { Drawer } from '../../../shared/ui/Drawer';
import { Dropdown } from '../../../shared/ui/Dropdown';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import { MapLibreChoropleth, type MapSelection } from '../../../shared/ui/MapLibreChoropleth';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { BAND_COUNT, TERCILE_BOUNDS } from '../../../shared/utils/tercilePalette';
import { deterministicRange } from '../subseasonal/cells';
import { SeasonalTownCard } from '../seasonal-advisory/components/SeasonalTownCard';
import {
  buildSeasonalCells,
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

// "All" first in both lists: it is the default, and the first thing a reader
// sees should be the whole picture.
const VARIABLE_OPTIONS = [
  { id: 'all', label: ALL_VARIABLES_LABEL },
  ...SEASONAL_VARIABLES.map((id) => ({ id, label: VARIABLE_INFO[id].label })),
];
const SEASON_OPTIONS = [{ id: 'all', label: ALL_SEASONS_LABEL }, ...SEASON_KEYS.map((id) => ({ id, label: SEASON_LABELS[id] }))];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-03" -> "3 Oct 2026". Parsed by hand, because `new Date()` on a bare
 * date reads it as UTC midnight and can print the day before west of Greenwich. */
function formatRunDate(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : null;
}

/**
 * The seasonal outlook, as a map of Ghana.
 *
 * The same shape as the Subseasonal segment beside it: map first, controls and
 * the reader's own town in a bottom drawer. What is different, and why:
 *
 * - **Seven variables, worked out from daily rain.** Onset, cessation and the
 *   two dry spells belong to a rainy season, so they come with a SEASON choice
 *   (All Seasons, Southern Major, Southern Minor, Northern Single). A named
 *   season paints only its own half of the country; All Seasons paints each
 *   zone's main season. Rainfall total, rainy days and temperature come with the
 *   fixed MAM, MJJ, JAS and SON windows instead.
 * - **All Variables and All Seasons by default.** The map then shows the
 *   rainfall total for the chosen three months, and the region and town cards
 *   list every variable.
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
  const [variableChoice, setVariableChoice] = useState<VariableChoice>('all');
  const [seasonKey, setSeasonKey] = useState<SeasonChoice>('all');
  const [windowKey, setWindowKey] = useState<WindowKey>('MAM');

  // A map colours one thing, so All Variables maps the rainfall total.
  const variable: SeasonalVariableId = variableChoice === 'all' ? 'rainfallTotal' : variableChoice;
  const isAll = variableChoice === 'all';
  const isSeason = isSeasonVariable(variable);
  const block = useMemo(() => (set ? pickBlock(set, variable, seasonKey, windowKey) : undefined), [set, variable, seasonKey, windowKey]);
  const blockCells = useMemo(() => block?.cells ?? [], [block]);
  const blockLabel = block
    ? `${block.label} ${block.year}`
    : isSeason
      ? seasonKey === 'all'
        ? ALL_SEASONS_LABEL
        : SEASON_LABELS[seasonKey]
      : windowKey;
  const ready = useMemo(() => readyFrom(block, variable), [block, variable]);
  const normalOnly = ready !== null;

  const anyProbabilities = useMemo(() => hasProbabilities(blockCells, variable), [blockCells, variable]);
  // Null until the reader chooses, so the default follows the data.
  const view = VIEWS[viewIndex ?? (anyProbabilities ? 0 : 1)];
  // Chances need a forecast. Beyond the model's reach there is only the normal,
  // so the map keeps showing it and the drawer says why (see probabilityNote).
  const isProbability = view === 'probability' && !normalOnly;
  const probabilityNote = view === 'probability' && normalOnly;
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
      return { outlook: buildSeasonalOutlook(set, locationId, variableChoice, seasonKey, windowKey) };
    } catch (caught) {
      return { error: caught };
    }
  }, [set, locationId, variableChoice, seasonKey, windowKey]);

  // A tap on a region opens that region's full seasonal advisory, for the
  // season and months the map is showing when they apply there.
  const handleSelect = useCallback(
    (next: MapSelection) => {
      if (!next.region) return;
      const seasons = seasonsOf(sectorOf(next.region));
      const season = seasonKey !== 'all' && seasons.includes(seasonKey) ? seasonKey : mainSeasonOf(next.region);
      const window = SEASON_WINDOWS[season].includes(windowKey) ? windowKey : undefined;
      router.push({ pathname: '/seasonal/[region]', params: { region: next.region, season, ...(window ? { window } : {}) } });
    },
    [seasonKey, windowKey],
  );
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
            {/* The reader's own town first: it is why most people open this.
                Hidden while the whole outlook is missing, where the map's own
                empty state already says why. */}
            {unavailable ? null : (
              <AsyncStateView
                status={status === 'pending' ? 'pending' : town.error ? 'error' : 'success'}
                error={town.error}
                onRetry={onRetry}
                skeleton={<SubseasonalOutlookSkeleton />}
              >
                {town.outlook && set ? (
                  <SeasonalTownCard
                    set={set}
                    outlook={town.outlook}
                    variableChoice={variableChoice}
                    seasonChoice={seasonKey}
                    windowKey={windowKey}
                  />
                ) : null}
              </AsyncStateView>
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
              {probabilityNote ? (
                <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
                  Chances are worked out once the season is in the forecast, from {ready}. Until then the map shows the normal.
                </Text>
              ) : null}
            </View>

            {/* Eight choices are too many for a pill row, so a dropdown. */}
            <Dropdown
              label="VARIABLE"
              options={VARIABLE_OPTIONS}
              selectedId={variableChoice}
              onSelect={(id) => setVariableChoice(id as VariableChoice)}
            />

            {/* All Variables needs both: the season for the onset, dry spell and
                cessation rows, and the three months the map's rainfall covers. */}
            {isSeason || isAll ? (
              <Dropdown
                label="SEASON"
                options={SEASON_OPTIONS}
                selectedId={seasonKey}
                onSelect={(id) => setSeasonKey(id as SeasonChoice)}
              />
            ) : null}
            {isSeason ? null : (
              <View>
                <FieldLabel>{isAll ? 'MONTHS' : 'SEASON'}</FieldLabel>
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
                {!isSeason
                  ? `${blockLabel}, all regions.`
                  : seasonKey === 'all'
                    ? `${blockLabel}. The Northern Single Season in the five northern regions, and the Southern Major Season in the other eleven.`
                    : `${blockLabel}. ${seasonKey === 'northern' ? 'Covers the five northern regions.' : 'Covers the eleven southern regions.'}`}
                {isAll ? ' The map shows Rainfall Total (mm). Pick one variable to map it.' : ''}
              </Text>
            ) : null}

            <View style={{ gap: theme.spacing.xs }}>
              {showsDryNote ? (
                <Text variant="caption" muted>
                  Regions in their dry season show as No signal. Little rain falls there in these months, so there is no rainfall outlook.
                </Text>
              ) : null}

              {set?.stale ? (
                <Text variant="caption" muted>
                  This is the last outlook that was made. A newer one is on its way.
                </Text>
              ) : null}

              {/* One line of where it came from. The method notes live on the
                  advisory page, under "About this outlook". */}
              {set ? (
                <Text variant="caption" muted>
                  {set.source === 'gmet' && set.issuedBy ? `Issued by ${set.issuedBy}` : 'ECMWF SEAS5'}
                  {runDate ? ` · made ${runDate}` : ''}. Tap a region for its advice.
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
