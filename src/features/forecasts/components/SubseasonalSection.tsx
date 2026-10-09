import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { cellAt, getSubseasonalSeries, outlookAt } from '../../../shared/api/subseasonalService';
import type { SpatialGeography, SpatialValueFormat } from '../../../shared/domain/spatialOutlook';
import type {
  SubseasonalCell,
  SubseasonalOutlook,
  SubseasonalOutlookSet,
  SubseasonalVariableId,
  SubseasonalView,
} from '../../../shared/domain/subseasonalOutlook';
import { unitFor } from '../../../shared/domain/subseasonalOutlook';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { ChoroplethMap } from '../../../shared/ui/ChoroplethMap';
import { Button } from '../../../shared/ui/Button';
import { ColorScaleLegend } from '../../../shared/ui/ColorScaleLegend';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { Drawer } from '../../../shared/ui/Drawer';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import { MapLibreChoropleth, type MapSelection } from '../../../shared/ui/MapLibreChoropleth';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { RAINFALL_STOPS, TEMPERATURE_STOPS } from '../../../shared/utils/colorScale';
import { BAND_COUNT, TERCILE_BOUNDS, paletteFor } from '../../../shared/utils/tercilePalette';
import { buildSubseasonalCells, deterministicRange, selectionPlaceName } from '../subseasonal/cells';
import type { Place } from '../subseasonal/places';
import { PlaceSearch } from './PlaceSearch';
import { SubseasonalPlaceAnswer } from './SubseasonalPlaceAnswer';
import { SubseasonalSpreadChart } from './SubseasonalSpreadChart';
import { SpatialOutlookSkeleton, SubseasonalOutlookSkeleton } from './ForecastSkeletons';

type Props = {
  /** The reader's own town, shown as guidance inside the drawer. */
  outlook: SubseasonalOutlook | undefined;
  /** The model's field, which is what the map draws. */
  set: SubseasonalOutlookSet | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
  /**
   * The reader's own town is a separate query from the map (`set`), keyed by
   * location rather than the nationwide field, so it can fail — or lack a
   * baked baseline — independently of a perfectly healthy map. Kept apart
   * from `status`/`error` above rather than merged: merging would blank the
   * map out whenever only the personal card fails, which is worse than the
   * card failing on its own.
   */
  outlookStatus: 'pending' | 'error' | 'success';
  outlookError?: unknown;
  onRetryOutlook: () => void;
};

/** Matches the Seasonal segment's map exactly, so switching between the two
 * timescales does not resize the country under the reader. */
const MAP_HEIGHT = 520;

const VIEW_SEGMENTS = ['Probability', 'Deterministic'];
const VIEWS: SubseasonalView[] = ['probability', 'deterministic'];

const GEOGRAPHY_SEGMENTS = ['Region', 'District'];
const GEOGRAPHIES: SpatialGeography[] = ['region', 'district'];

const VARIABLE_SEGMENTS = ['Rainfall', 'Temperature'];
const VARIABLES: SubseasonalVariableId[] = ['rainfall', 'temperature'];

/**
 * The weeks 2 to 4 outlook, as a map of Ghana.
 *
 * Draws NOAA GEFS's own 0.5 degree field: 31 members reduced either to a tercile
 * split against an ERA5 1995-2024 baseline, or to the ensemble mean. Same shape
 * as the Seasonal segment beside it — map first, selectors and guidance in a
 * bottom drawer — because the two are one idea at two timescales.
 *
 * **What the District toggle does and does not mean.** It changes which admin
 * outline the field is clipped to, not the resolution of the field. Districts
 * inside one 55 km cell read identically, and the drawer says so. That is the
 * honest version of a district view: the model's real detail under a familiar
 * boundary, rather than detail invented to fill one.
 */
export function SubseasonalSection({ outlook, set, status, error, onRetry, outlookStatus, outlookError, onRetryOutlook }: Props) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const hasProbabilities = useMemo(
    () => (set?.cells ?? []).some((cell) => cell.rainfall?.probabilities || cell.temperature?.probabilities),
    [set],
  );
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [geographyIndex, setGeographyIndex] = useState(0);
  const [variableIndex, setVariableIndex] = useState(0);
  const [selection, setSelection] = useState<MapSelection | null>(null);

  // Null until the reader chooses, so the default can follow the data rather
  // than being frozen at whatever the first render happened to know.
  const view = VIEWS[viewIndex ?? (hasProbabilities ? 0 : 1)];
  const geography = GEOGRAPHIES[geographyIndex];
  const variable = VARIABLES[variableIndex];
  const isProbability = view === 'probability';
  // A tenth of a degree is inside the ensemble's own spread, so temperature is
  // reported whole. Rainfall keeps the range-based rule, which already gives
  // whole millimetres over a spread this wide.
  const valueFormat: SpatialValueFormat = variable === 'temperature' ? 'temperature' : 'number';
  // One ramp, handed to the legend and to both renderers. Rainfall and
  // temperature drawn in the same colours are two maps a reader cannot tell
  // apart at a glance; the unit in the legend is not a strong enough cue.
  const stops = variable === 'temperature' ? TEMPERATURE_STOPS : RAINFALL_STOPS;

  const cells = useMemo(() => buildSubseasonalCells(set?.cells ?? [], variable, view, geography), [set, variable, view, geography]);

  // Rainfall and temperature carry different published conventions, so the
  // palette follows the variable rather than being fixed to the view.
  const palette = paletteFor(variable);
  const range = useMemo(() => deterministicRange(cells), [cells]);
  const min = isProbability ? 0 : range.min;
  const max = isProbability ? BAND_COUNT - 1 : range.max;

  const isEmpty = Boolean(set?.unavailable) || cells.length === 0;

  // A failed fetch and an uncomputed outlook both arrive empty, and the old copy
  // called both "not computed yet" -- which reads as "come back tomorrow" when
  // the truth is "the server could not reach the model, tap Retry". The backend
  // now says which one it is, so the reader gets the sentence that matches.
  const fetchFailed = Boolean(set?.fetchFailed);

  // Ordered deliberately: a refresh already running outranks the failure that
  // may have preceded it, because the reader has nothing to do but wait, and the
  // query is polling on their behalf.
  const computing = Boolean(set?.computing);

  // Selecting a place opens the drawer at its detail: a chart behind a collapsed
  // drawer would be a tap that appears to do nothing.
  const handleSelect = useCallback((next: MapSelection) => {
    setSelection(next);
    setDrawerExpanded(true);
  }, []);

  // Tapping the map past the edge of the forecast is the ordinary "put it away"
  // gesture for a bottom sheet, and the reader has already been given the
  // handle for the deliberate version.
  const handleDismiss = useCallback(() => setDrawerExpanded(false), []);
  const showsDetail = !isEmpty && selection !== null;
  const selectedGuidance = useMemo(
    () => (showsDetail && set && selection ? outlookAt(set, selection.lat, selection.lng, selectionPlaceName(selection, geography)) : null),
    [showsDetail, set, selection, geography],
  );

  const handleSearch = useCallback(
    (place: Place) => {
      // Searching for a district is a statement about which outline the reader
      // cares about, so the map switches to that geography rather than leaving
      // them looking at regions while the panel names a district.
      if (place.kind === 'district') setGeographyIndex(GEOGRAPHIES.indexOf('district'));
      handleSelect({
        lat: place.lat,
        lng: place.lng,
        region: place.region ?? (place.kind === 'region' ? place.name : null),
        district: place.kind === 'district' ? place.name : null,
        label: '',
      });
    },
    [handleSelect],
  );

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

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<SpatialOutlookSkeleton />}>
      {/* The empty state replaces the *map*, never the drawer. It used to swap
          out the whole section, which took the Forecast view toggle with it --
          so the message told a reader to switch to Deterministic on a screen
          that no longer offered the control. A dead end dressed as advice. */}
      <View style={{ flex: 1 }}>
        {/* The map fills the whole area, under the drawer too, the way a map
            app's sheet floats over its map. A fixed height left a blank strip
            between the map and a collapsed drawer whenever the legend, and so
            the collapsed drawer, was shorter than the gap it was guessed for. */}
        <View style={{ flex: 1 }} onLayout={(event) => setMapHeight(Math.round(event.nativeEvent.layout.height))}>
          {isEmpty ? (
            // Never a flat three-way split: "we could not compute this" and "the
            // ensemble sees no signal" look identical on a map and mean opposite
            // things.
            <EmptyState
              icon={computing ? 'time-outline' : fetchFailed ? 'cloud-offline-outline' : 'calendar-outline'}
              title={
                computing
                  ? 'Getting the outlook ready'
                  : fetchFailed
                    ? 'The weather service did not answer'
                    : isProbability
                      ? 'No probabilities have been computed yet'
                      : 'No outlook has been computed yet'
              }
              message={
                computing
                  ? 'The weeks 2 to 4 outlook covers the whole country, so it takes a few seconds to build. This will fill in on its own.'
                  : fetchFailed
                    ? 'The weeks 2 to 4 outlook could not be fetched. Try again in a moment. The Today and 7-Day forecasts are unaffected.'
                    : isProbability
                      ? 'The tercile baseline is still being built. The ensemble average needs no baseline and is ready now.'
                      : 'The weeks 2 to 4 outlook could not be computed. The Today and 7-Day forecasts are unaffected.'
              }
            >
              {/* The action itself, not directions to it. Telling a reader to
                  "switch below" points at a control inside the drawer, which is
                  hidden whenever the drawer is collapsed -- advice they cannot
                  follow, on the one screen with nothing else to do. */}
              {/* No button while it is being prepared: the query is already
                  polling, so a Retry would either do nothing visible or invite
                  the reader to hammer an endpoint that is working. */}
              {computing ? null : fetchFailed ? (
                <Button label="Try again" variant="outline" onPress={onRetry} />
              ) : isProbability ? (
                <Button label="Show the ensemble average" variant="outline" onPress={() => setViewIndex(VIEWS.indexOf('deterministic'))} />
              ) : null}
            </EmptyState>
          ) : (
            <>
              {isOnline ? (
                <MapLibreChoropleth
                  cells={cells}
                  min={min}
                  max={max}
                  geography={geography}
                  height={mapHeight || MAP_HEIGHT}
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
                  geography={geography}
                  height={mapHeight || MAP_HEIGHT}
                  isTercile={isProbability}
                  palette={isProbability ? palette : undefined}
                  stops={stops}
                />
              )}
            </>
          )}
        </View>

        {/* Drawer supplies the one scroll container for everything below the
            legend — a nested ScrollView here would fight it for the drag/
            scroll gesture that expands the sheet. */}
        <Drawer expanded={drawerExpanded} onExpandedChange={setDrawerExpanded} persistentContent={legend}>
          <View style={{ gap: theme.spacing.lg }}>
            <PlaceSearch onSelect={handleSearch} />

            {showsDetail && selection ? (
              <SelectionDetail
                selection={selection}
                cell={cellAt(set?.cells ?? [], selection.lat, selection.lng)}
                variable={variable}
                geography={geography}
                windowStart={set?.windowStart}
                baseline={set?.baseline}
                guidance={selectedGuidance}
                onClear={() => setSelection(null)}
              />
            ) : null}

            {/* A searched or tapped place takes the drawer: its detail is
                  what the reader asked for, so the switches step aside until
                  they close it (the panel's own close button brings them
                  back). */}
            {showsDetail ? null : (
              <>
                {/* Matches the Seasonal segment's own selector style
                    (SeasonalSection) — a caps FieldLabel over a pill, one
                    full-width row each, no grid or card grouping them. Geography
                    and Variable used to share a row, which left "Temperature"
                    about 60px and shrank it below every other label in the
                    drawer. A row each keeps all the labels at the same size. */}
                <View>
                  <FieldLabel>FORECAST VIEW</FieldLabel>
                  <SegmentedControl
                    segments={VIEW_SEGMENTS}
                    selectedIndex={VIEWS.indexOf(view)}
                    onChange={setViewIndex}
                    accessibilityLabel="Forecast view"
                    equalWidth
                  />
                </View>

                <View>
                  <FieldLabel>GEOGRAPHY</FieldLabel>
                  <SegmentedControl
                    segments={GEOGRAPHY_SEGMENTS}
                    selectedIndex={geographyIndex}
                    onChange={setGeographyIndex}
                    accessibilityLabel="Geography"
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
              </>
            )}

            {/* With a place open, its advice lives in the panel above, read
                from the cell under it: a farmer who searched for Bongo is
                planning for Bongo, not for their home town. */}
            {showsDetail ? null : (
              /* The reader's own town is a separate query from the map above,
                 so it can fail on its own (a rate-limited upstream, or a town
                 whose grid cell has no baked baseline yet) while the map stays
                 healthy. Its own AsyncStateView, so a personal-card failure
                 never blanks the map underneath it. */
              <AsyncStateView
                status={outlookStatus}
                error={outlookError}
                onRetry={onRetryOutlook}
                skeleton={<SubseasonalOutlookSkeleton />}
              >
                {outlook ? <ReaderGuidance outlook={outlook} /> : null}
              </AsyncStateView>
            )}

            {/* Not optional. A district outline over a 55 km field looks more
                precise than it is. The general caveat and the model line were
                dropped from the foot: the panel's figures already say how many
                runs and against which record. */}
            {geography === 'district' ? (
              <Text variant="caption" muted>
                District outlines are drawn over a 55 km forecast grid, so neighbouring districts often share one reading. The boundary is
                precise; the forecast underneath it is not.
              </Text>
            ) : null}
          </View>
        </Drawer>
      </View>
    </AsyncStateView>
  );
}

/**
 * A searched or tapped place, answer first: the outcome and its chances, the
 * day-by-day curve, then what to do. The order a farmer asks in ("will it be
 * wetter?", "when?", "so what do I do?"), and the order the big weather apps
 * lead a place with.
 */
function SelectionDetail({
  selection,
  cell,
  variable,
  geography,
  windowStart,
  baseline,
  guidance,
  onClear,
}: {
  selection: MapSelection;
  /** The model cell under the selection, for the split and the normal. The
   * series endpoint returns the day-by-day curve but not the comparison against
   * climatology, and that comparison is the whole point of the segment. */
  cell: SubseasonalCell | undefined;
  variable: SubseasonalVariableId;
  geography: SpatialGeography;
  /** The first day of the window, so the chart's axis carries real dates. */
  windowStart?: string;
  /** The server's own name for the baseline. Never derived from the clock: the
   * record is fixed at bake time, so counting back thirty years from today
   * would misname it by however long ago the bake ran. */
  baseline?: string | null;
  /** This place's own advice, or null when its cell has no split to give it. */
  guidance: SubseasonalOutlook | null;
  onClear: () => void;
}) {
  const theme = useTheme();

  // Keyed by the grid cell, not the district name: two districts inside one cell
  // share a series, and keying by name would fetch the same cell twice.
  const query = useQuery({
    queryKey: ['subseasonalSeries', Math.round(selection.lat * 2) / 2, Math.round(selection.lng * 2) / 2],
    queryFn: () => getSubseasonalSeries(selection.lat, selection.lng),
  });

  const series = variable === 'rainfall' ? query.data?.rainfall : query.data?.temperature;
  const reading = variable === 'rainfall' ? cell?.rainfall : cell?.temperature;
  const place = selectionPlaceName(selection, geography);
  // A district is named with its region beneath it, so "Bongo" is placed.
  const within = selection.district && selection.region && place !== selection.region ? selection.region : null;

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ gap: theme.spacing.lg }}>
        <SelectionHeader place={place} within={within} onClear={onClear} />
        {reading ? <SubseasonalPlaceAnswer reading={reading} variable={variable} baseline={baseline} /> : null}
      </View>

      <View>
        <FieldLabel>DAY BY DAY</FieldLabel>
        <AsyncStateView status={query.status} error={query.error} onRetry={query.refetch}>
          {series ? (
            <SubseasonalSpreadChart series={series} variable={variable} windowStart={windowStart} />
          ) : (
            <Text variant="caption" muted>
              No day-by-day forecast covers this point.
            </Text>
          )}
        </AsyncStateView>
      </View>

      {guidance ? (
        <View>
          <FieldLabel>WHAT TO DO</FieldLabel>
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="bodyStrong">{guidance.farmerActionCard.headline}</Text>
            <BulletList items={guidance.farmerActionCard.actions} accent />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The panel's own header, echoing the day-detail sheet: the place named on the
 * left, and a close control rather than a text link -- an X is what a reader
 * reaches for to dismiss a panel, and it does not compete with the title. */
function SelectionHeader({ place, within, onClear }: { place: string; within: string | null; onClear: () => void }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
      <View style={{ flex: 1 }}>
        <Text variant="h2" numberOfLines={2}>
          {place}
        </Text>
        {within ? (
          <Text variant="caption" muted>
            {within}
          </Text>
        ) : null}
      </View>
      {/* A 44 pt target, the platform minimum, drawn as a soft round button so
          it reads as a control and not as a stray glyph. */}
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={`Close ${place} details`}
        hitSlop={4}
        style={{ width: theme.minTouchTarget, height: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.text + '14',
          }}
        >
          <Ionicons name="close" size={18} color={theme.colors.text} />
        </View>
      </Pressable>
    </View>
  );
}

/** What this means where the reader actually is. */
function ReaderGuidance({ outlook }: { outlook: SubseasonalOutlook }) {
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

      <Text variant="bodyStrong">{outlook.farmerActionCard.headline}</Text>
      <BulletList items={outlook.farmerActionCard.actions} accent />
    </View>
  );
}
