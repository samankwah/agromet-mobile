import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import type { SeasonalOutlook } from '../../../shared/domain/seasonalOutlook';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { ChoroplethMap } from '../../../shared/ui/ChoroplethMap';
import { ColorScaleLegend } from '../../../shared/ui/ColorScaleLegend';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { Drawer } from '../../../shared/ui/Drawer';
import { Dropdown } from '../../../shared/ui/Dropdown';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import { MapLibreChoropleth } from '../../../shared/ui/MapLibreChoropleth';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { useSpatialOutlookData } from './useSpatialOutlookData';

const FORECAST_VIEW_SEGMENTS = ['Probability', 'Deterministic'];
const GEOGRAPHY_SEGMENTS = ['Region', 'District'];

type Props = {
  /** The seasonal outlook's plain-language guidance, shown inside the
   * drawer beneath the legend. The product rule is that a probabilistic
   * outlook is never presented without its uncertainty explanation — so
   * this travels with the map rather than living on a separate screen. */
  seasonal: SeasonalOutlook | undefined;
};

/**
 * The Outlook tab's landing view: agro-characteristic selectors in a
 * bottom drawer over a spatial display of Ghana. Selecting a Forecast
 * View / Geography / Variable / Sub-season re-renders the choropleth —
 * the map *is* the outlook, not a drill-down from a text card.
 *
 * Embedded directly in the Forecasts tab (not a pushed full-screen
 * route), so the tab bar and timescale segments stay reachable.
 */
export function SpatialOutlookView({ seasonal }: Props) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const [drawerExpanded, setDrawerExpanded] = useState(true);

  const {
    forecastView,
    setForecastView,
    geography,
    setGeography,
    variableId,
    setVariableId,
    periodId,
    setPeriodId,
    variables,
    periodOptions,
    periodLabel,
    dataset,
    status,
    error,
    refetch,
  } = useSpatialOutlookData();

  return (
    <View style={{ flex: 1 }}>
      <AsyncStateView status={status} error={error} onRetry={refetch}>
        {/* Online: MapLibre over a CARTO basemap, so the forecast reads
            against real place names and roads. Offline: fall back to the
            SVG renderer, which draws the same data from the boundary file
            bundled in the app — no tiles, no network. A farmer with no
            signal still sees their forecast, just without the basemap
            context. */}
        {dataset ? (
          isOnline ? (
            <MapLibreChoropleth
              cells={dataset.cells}
              min={dataset.legend.min}
              max={dataset.legend.max}
              geography={geography}
              height={520}
              variableLabel={dataset.variable.label}
              valueFormat={dataset.variable.valueFormat}
              isTercile={forecastView === 'probability'}
            />
          ) : (
            <ChoroplethMap
              cells={dataset.cells}
              min={dataset.legend.min}
              max={dataset.legend.max}
              geography={geography}
              height={520}
              isTercile={forecastView === 'probability'}
            />
          )
        ) : null}
      </AsyncStateView>

      <Drawer
        expanded={drawerExpanded}
        onToggle={() => setDrawerExpanded((previous) => !previous)}
        persistentContent={
          dataset ? (
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                {dataset.variable.label} · {dataset.period.label}
              </Text>
              <ColorScaleLegend
                min={dataset.legend.min}
                max={dataset.legend.max}
                unit={dataset.legend.unit}
                valueFormat={dataset.variable.valueFormat}
                mode={forecastView === 'probability' ? 'tercile' : 'continuous'}
              />
            </View>
          ) : null
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }} contentContainerStyle={{ gap: theme.spacing.lg }}>
          <View>
            <FieldLabel>FORECAST VIEW</FieldLabel>
            <SegmentedControl
              segments={FORECAST_VIEW_SEGMENTS}
              selectedIndex={forecastView === 'probability' ? 0 : 1}
              onChange={(index) => setForecastView(index === 0 ? 'probability' : 'deterministic')}
              accessibilityLabel="Forecast view"
              variant="pill"
            />
          </View>

          <View>
            <FieldLabel>GEOGRAPHY</FieldLabel>
            <SegmentedControl
              segments={GEOGRAPHY_SEGMENTS}
              selectedIndex={geography === 'region' ? 0 : 1}
              onChange={(index) => setGeography(index === 0 ? 'region' : 'district')}
              accessibilityLabel="Geography level"
              variant="pill"
            />
          </View>

          <Dropdown
            label="VARIABLE"
            options={variables.map((variable) => ({ id: variable.id, label: variable.label }))}
            selectedId={variableId}
            onSelect={setVariableId}
          />
          {/* Season vs Sub-season: season-defining characteristics (onset,
              cessation, the dry spells, season length) are scoped to one of
              Ghana's rainfall seasons, while accumulations are reported over
              trimesters. The selector swaps vocabulary with the variable. */}
          <Dropdown label={periodLabel} options={periodOptions} selectedId={periodId} onSelect={setPeriodId} />

          {seasonal ? (
            <View style={{ gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text variant="bodyStrong">{seasonal.seasonLabel}</Text>
                <ConfidenceBadge level={seasonal.confidenceLevel} />
              </View>
              <Text variant="body" muted>
                {seasonal.plainLanguageSummary}
              </Text>
              <Text variant="bodyStrong">{seasonal.farmerActionCard.headline}</Text>
              <BulletList items={seasonal.farmerActionCard.actions} accent />
            </View>
          ) : null}

          <MockDataTag />
        </ScrollView>
      </Drawer>
    </View>
  );
}
