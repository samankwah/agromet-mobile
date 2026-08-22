import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { HazardKind } from '../../../shared/domain/hazard';
import { getHazardBandMeta, hazardBandColor } from '../../../shared/domain/hazardBand';
import { tint } from '../../../shared/theme/blend';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { DetailRow } from '../../../shared/ui/DetailRow';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { HazardBandBadge, HazardBandMeter } from './components/HazardBandBadge';
import { HazardCharts } from './components/HazardCharts';
import { HazardDrivers } from './components/HazardDrivers';
import { RegionHazardSkeleton } from './components/HazardSkeletons';
import { useHazardRegion, useHazardSummary } from './useHazards';

const HAZARDS: HazardKind[] = ['flood', 'drought'];

type Props = {
  region: string;
  initialHazard?: HazardKind;
};

/**
 * One region's reading, in full.
 *
 * A pushed screen rather than a panel under the map: the web page keeps this
 * inline, which works at 1200px and is unreachable on a phone below sixteen
 * list rows.
 *
 * The two queries are deliberately split. Everything except the charts —
 * bands, drivers, advisories, override — already arrives in the national
 * summary, which is very likely cached; only the daily series needs the
 * per-region call. So a cold or failing region endpoint costs the reader two
 * charts, not the whole screen.
 */
export function RegionHazardScreen({ region, initialHazard = 'flood' }: Props) {
  const theme = useTheme();
  const [hazardIndex, setHazardIndex] = useState(HAZARDS.indexOf(initialHazard));
  const hazard = HAZARDS[hazardIndex] ?? 'flood';

  const summary = useHazardSummary();
  const detail = useHazardRegion(region);

  const row = useMemo(
    () => summary.regions.find((entry) => entry.region === region),
    [summary.regions, region],
  );

  const block = row?.[hazard];
  const meta = getHazardBandMeta(block?.band);
  const drought = row?.drought;

  return (
    <Screen>
      <AsyncStateView
        status={row ? 'success' : summary.status}
        error={summary.error}
        onRetry={summary.refetch}
        skeleton={<RegionHazardSkeleton />}
      >
        {!row || !block ? null : (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: 2 }}>
              <Text variant="h1">{row.region}</Text>
              <Text variant="body" muted>
                {row.agroZone} · {hazard === 'flood' ? 'Flood risk' : 'Drought stress'}
              </Text>
            </View>

            <SegmentedControl
              segments={['Flood', 'Drought']}
              selectedIndex={hazardIndex}
              onChange={setHazardIndex}
              accessibilityLabel="Hazard shown"
              variant="pill"
            />

            <Card style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <HazardBandBadge band={block.band} />
                <Text variant="h2">{Math.round(block.score)}<Text variant="caption" muted> of 100</Text></Text>
              </View>
              <HazardBandMeter band={block.band} score={block.score} />
              <Text variant="caption" muted>
                {meta.description}
              </Text>
            </Card>

            {/* An override is never silent: the reader is told a bulletin is in
                force AND what the model independently said. */}
            {block.overridden ? (
              <Card
                style={{
                  gap: theme.spacing.xs,
                  backgroundColor: tint(theme.colors.accent, theme.colors.surface, 0.08),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Ionicons name="document-text-outline" size={18} color={theme.colors.accent} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {block.headline ?? 'A published bulletin is in force'}
                  </Text>
                </View>
                <Text variant="caption" muted>
                  Issued by {block.issuedBy ?? 'GMet'}
                  {block.computed ? ` · the model alone reads ${getHazardBandMeta(block.computed.band).label.toLowerCase()}` : ''}
                </Text>
              </Card>
            ) : null}

            {/* Guidance above the evidence: it is the payload, and the drivers
                and charts exist to support it, not to precede it. */}
            <Card style={{ gap: theme.spacing.sm }} raised>
              <Text variant="h3">What to do</Text>
              {block.advisories.length > 0 ? (
                <BulletList items={block.advisories} accent />
              ) : (
                <Text variant="body" muted>
                  No action needed beyond normal seasonal practice.
                </Text>
              )}
            </Card>

            <HazardDrivers
              drivers={block.drivers}
              note={
                hazard === 'flood' && !row.riverine
                  ? 'No major monitored river reach falls in this region, so flood risk here is scored from rainfall alone. Flooding is typically drainage-related rather than riverine.'
                  : hazard === 'drought' && drought?.spi === null
                    ? 'The rainfall anomaly is outside its valid range this month — a 90-day dry season total is too close to zero for the index to be meaningful.'
                    : null
              }
            />

            <Card style={{ gap: theme.spacing.sm }}>
              <Text variant="h3">Both hazards</Text>
              {HAZARDS.map((kind) => (
                <DetailRow
                  key={kind}
                  label={kind === 'flood' ? 'Flood' : 'Drought'}
                  value={`${getHazardBandMeta(row[kind].band).label} · ${Math.round(row[kind].score)}`}
                  dotColor={hazardBandColor(row[kind].band, theme)}
                />
              ))}
              {drought?.spi !== null && drought?.spi !== undefined ? (
                <DetailRow
                  label="90-day rainfall anomaly"
                  value={`${drought.spi > 0 ? '+' : ''}${drought.spi} · ${drought.spiClass ?? ''}`}
                />
              ) : null}
              <Text variant="caption" muted>
                Both hazards use the same 0-100 scale, so their severities can be compared directly.
                Currently dominant: {row.dominant}.
              </Text>
            </Card>

            {/* Only the charts depend on the per-region call, so a cold region
                endpoint costs three charts rather than the whole screen. */}
            <AsyncStateView
              status={detail.status}
              error={detail.error}
              onRetry={detail.refetch}
              skeleton={<RegionHazardSkeleton />}
            >
              <HazardCharts
                series={detail.data?.series}
                discharge={detail.data?.discharge}
                riverine={row.riverine}
                normalMm={drought?.precip90dNormalMm}
              />
            </AsyncStateView>

            <Text variant="caption" muted>
              A regional indicator, not a district forecast. In an emergency follow NADMO instructions
              for your district.
            </Text>
          </View>
        )}
      </AsyncStateView>
    </Screen>
  );
}
