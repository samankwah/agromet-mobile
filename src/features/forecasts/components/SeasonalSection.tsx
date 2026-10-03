import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { buildSeasonalOutlook, regionCell } from '../../../shared/api/seasonalService';
import type { SpatialValueFormat } from '../../../shared/domain/spatialOutlook';
import type {
  SeasonalOutlook,
  SeasonalOutlookSet,
  SeasonalVariable,
  SeasonalVariableId,
  SeasonalView,
} from '../../../shared/domain/seasonalOutlook';
import { unitFor } from '../../../shared/domain/subseasonalOutlook';
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
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import { MapLibreChoropleth, type MapSelection } from '../../../shared/ui/MapLibreChoropleth';
import { SectionHeading } from '../../../shared/ui/SectionHeading';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { RAINFALL_STOPS, TEMPERATURE_STOPS } from '../../../shared/utils/colorScale';
import { BAND_COUNT, TERCILE_BOUNDS, paletteFor } from '../../../shared/utils/tercilePalette';
import { deterministicRange } from '../subseasonal/cells';
import { buildSeasonalCells, hasDryWindow, hasProbabilities } from '../seasonal/cells';
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

const VIEW_SEGMENTS = ['Probability', 'Average'];
const VIEWS: SeasonalView[] = ['probability', 'average'];

const VARIABLE_SEGMENTS = ['Rainfall', 'Temperature'];
const VARIABLES: SeasonalVariableId[] = ['rainfall', 'temperature'];

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
 * The same shape as the Subseasonal segment beside it -- map first, controls and
 * the reader's own town in a bottom drawer -- because the two are one idea at two
 * timescales. Three differences, each deliberate:
 *
 * - **No geography control.** The payload is one reading per region. A district
 *   outline over it would claim a detail the model does not have, so the drawer
 *   says the map is by region and why.
 * - **A season control.** The run covers three overlapping three-month windows,
 *   and which one matters depends on what the farmer is planning.
 * - **A published forecast can be in force.** Then the map shows it, a notice
 *   says who issued it, and the town card adds what the model alone reads, so
 *   the two are never blurred into one.
 */
export function SeasonalSection({ set, status, error, onRetry, locationId }: Props) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [variableIndex, setVariableIndex] = useState(0);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [selection, setSelection] = useState<MapSelection | null>(null);

  const windows = useMemo(() => set?.windows ?? [], [set]);
  // A new run can carry fewer windows than the one before it; never index past
  // the end and draw nothing.
  const season = windows[Math.min(seasonIndex, Math.max(windows.length - 1, 0))];
  const windowCells = useMemo(() => season?.cells ?? [], [season]);

  const anyProbabilities = useMemo(() => windows.some((entry) => hasProbabilities(entry.cells)), [windows]);
  // Null until the reader chooses, so the default follows the data.
  const view = VIEWS[viewIndex ?? (anyProbabilities ? 0 : 1)];
  const variable = VARIABLES[variableIndex];
  const isProbability = view === 'probability';
  const valueFormat: SpatialValueFormat = variable === 'temperature' ? 'temperature' : 'number';
  const stops = variable === 'temperature' ? TEMPERATURE_STOPS : RAINFALL_STOPS;
  const palette = paletteFor(variable);

  const cells = useMemo(() => buildSeasonalCells(windowCells, variable, view), [windowCells, variable, view]);
  const range = useMemo(() => deterministicRange(cells), [cells]);
  const min = isProbability ? 0 : range.min;
  const max = isProbability ? BAND_COUNT - 1 : range.max;

  const unavailable = !set || set.unavailable || windows.length === 0;
  const isEmpty = unavailable || cells.length === 0;
  // A refresh already running outranks the failure before it: the reader has
  // nothing to do but wait, and the query is polling for them.
  const computing = Boolean(set?.computing);
  const fetchFailed = Boolean(set?.fetchFailed);
  const showsDryNote = !isEmpty && isProbability && variable === 'rainfall' && hasDryWindow(windowCells);

  // The town card is a slice of the set already in hand, so it follows the
  // season control without a second request. It still gets its own error state:
  // a town whose region has no reading must not blank a healthy map.
  const town = useMemo((): { outlook?: SeasonalOutlook; error?: unknown } => {
    if (!set) return {};
    try {
      return { outlook: buildSeasonalOutlook(set, locationId, season?.key) };
    } catch (caught) {
      return { error: caught };
    }
  }, [set, locationId, season]);

  const handleSelect = useCallback((next: MapSelection) => {
    setSelection(next);
    setDrawerExpanded(true);
  }, []);
  const handleDismiss = useCallback(() => setDrawerExpanded(false), []);

  const legend = isEmpty ? null : (
    <ColorScaleLegend
      min={min}
      max={max}
      unit={isProbability ? '' : unitFor(variable)}
      mode={isProbability ? 'tercile' : 'continuous'}
      valueFormat={valueFormat}
      categories={isProbability ? palette : undefined}
      bounds={isProbability ? TERCILE_BOUNDS : undefined}
      stops={stops}
      unitPlacement="value"
    />
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
                      ? 'No chances worked out for this season yet'
                      : 'No seasonal outlook has been computed yet'
              }
              message={
                computing
                  ? 'The seasonal outlook takes a little while to build. This will fill in on its own.'
                  : fetchFailed
                    ? 'The seasonal outlook could not be fetched. Try again in a moment. The Today and 7-Day forecasts are unaffected.'
                    : !unavailable && isProbability
                      ? 'The long-term record for these months is not ready yet. The average forecast is ready now.'
                      : 'The seasonal outlook could not be computed. The Today and 7-Day forecasts are unaffected.'
              }
            >
              {/* No button while it is being prepared: the query is already
                  polling. */}
              {computing ? null : fetchFailed ? (
                <Button label="Try again" variant="outline" onPress={onRetry} />
              ) : !unavailable && isProbability ? (
                <Button label="Show the average" variant="outline" onPress={() => setViewIndex(VIEWS.indexOf('average'))} />
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
              variableLabel={VARIABLE_SEGMENTS[variableIndex]}
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
                reading={(() => {
                  const cell = regionCell(season, selection.region);
                  return (variable === 'rainfall' ? cell?.rainfall : cell?.temperature) ?? null;
                })()}
                variable={variable}
                windowLabel={season?.label ?? ''}
                onClear={() => setSelection(null)}
              />
            )}

            {/* The same selector style as the Subseasonal drawer: a caps label
                over a full-width pill, one row each. */}
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

            <View>
              <FieldLabel>VARIABLE</FieldLabel>
              <SegmentedControl
                segments={VARIABLE_SEGMENTS}
                selectedIndex={variableIndex}
                onChange={setVariableIndex}
                accessibilityLabel="Outlook variable"
                equalWidth
              />
            </View>

            {windows.length > 0 ? (
              <View>
                <FieldLabel>SEASON</FieldLabel>
                <SegmentedControl
                  segments={windows.map((entry) => entry.label)}
                  selectedIndex={Math.min(seasonIndex, windows.length - 1)}
                  onChange={setSeasonIndex}
                  accessibilityLabel="Season"
                  equalWidth
                />
              </View>
            ) : null}

            {/* Hidden while the whole outlook is missing: the map's own empty
                state already says why, and a second copy of it here adds
                nothing. */}
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

              {/* A probabilistic outlook never travels without its uncertainty
                  note. */}
              <Text variant="caption" muted>
                A guide to the coming three months, not a day-to-day forecast. Use it to plan the season, and follow the Today and 7-Day
                sections for what to do this week.
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
  windowLabel,
  onClear,
}: {
  region: string;
  reading: SeasonalVariable | null;
  variable: SeasonalVariableId;
  windowLabel: string;
  onClear: () => void;
}) {
  const theme = useTheme();
  const unit = unitFor(variable);
  const isRain = variable === 'rainfall';

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
          There is no {isRain ? 'rainfall' : 'temperature'} outlook for {region} from {windowLabel}.
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <SectionHeading title="Compared with normal" subtitle={windowLabel} />
            {reading.confidence && reading.probabilities && !reading.dryWindow ? <ConfidenceBadge level={reading.confidence} /> : null}
          </View>
          <Card style={{ gap: theme.spacing.sm }}>
            <DetailRow label={isRain ? 'Forecast total' : 'Forecast average'} value={`${Math.round(reading.value)}${unit}`} />
            {reading.normal === null ? null : <DetailRow label="Normal for these months" value={`${Math.round(reading.normal)}${unit}`} />}
            {reading.probabilities && !reading.dryWindow ? (
              <>
                <Divider />
                <DetailRow label={isRain ? 'Drier than normal' : 'Cooler than normal'} value={pct(reading.probabilities.below)} />
                <DetailRow label="Near normal" value={pct(reading.probabilities.normal)} />
                <DetailRow label={isRain ? 'Wetter than normal' : 'Warmer than normal'} value={pct(reading.probabilities.above)} />
              </>
            ) : null}
          </Card>
          <Text variant="caption" muted>
            {reading.dryWindow
              ? `This is the dry season in ${region}, so there is no rainfall outlook for these months.`
              : reading.probabilities
                ? `Out of ${reading.members} forecast runs.`
                : `The average of ${reading.members} forecast runs. There is no long-term record here yet to compare it with.`}
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
          {outlook.region}
        </Text>
        <ConfidenceBadge level={outlook.confidenceLevel} />
      </View>

      <Text variant="body" muted>
        {outlook.plainLanguageSummary}
      </Text>
      {outlook.temperatureSummary ? (
        <Text variant="body" muted>
          {outlook.temperatureSummary}
        </Text>
      ) : null}
      {outlook.modelSummary ? (
        <Text variant="caption" muted>
          {outlook.modelSummary}
        </Text>
      ) : null}
    </View>
  );
}
