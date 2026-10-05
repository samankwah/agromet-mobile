import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { formatYearMonth, SEASON_LABELS } from '../../../shared/domain/seasonalOutlook';
import type { SeasonKey, SeasonalVariableId, WindowKey } from '../../../shared/domain/seasonalOutlook';
import { ADVICE_LABELS, type SeasonalAdvice } from '../../../shared/domain/seasonalAdvice';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge';
import { Divider } from '../../../shared/ui/Divider';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { figureOf, isForecast, leanOf } from './adviceText';
import { LinkRow } from './components/AdviceRows';
import { ChanceBar } from './components/ChanceBar';
import { Notice } from './components/Notice';
import { useSeasonalAdvice } from './useSeasonalAdvice';

/** "Southern Major Season 2027", or "March to May 2027" for a three month figure. */
function spanLabel(advice: SeasonalAdvice, isWindow: boolean): string {
  const label = isWindow ? advice.window.label : SEASON_LABELS[advice.season.key];
  const year = isWindow ? advice.window.year : advice.season.year;
  return year ? `${label} ${year}` : label;
}

type Props = {
  region: string;
  variable: SeasonalVariableId;
  season?: SeasonKey;
  window?: WindowKey;
};

/**
 * One condition, in full: what the outlook says, how sure it is, and what to do.
 *
 * Opened from a figure on the full seasonal advisory, or from the town card
 * when one variable is chosen on the map. Shares its query with the full page,
 * so moving between the two costs nothing.
 */
export function SeasonalConditionScreen({ region, variable, season, window }: Props) {
  const theme = useTheme();
  const advice = useSeasonalAdvice(region, season, window);
  const item = advice.data?.conditions.find((entry) => entry.variable === variable);
  const isWindow = variable === 'rainfallTotal' || variable === 'rainyDays' || variable === 'temperature';

  return (
    <Screen>
      <AsyncStateView status={advice.status} error={advice.error} onRetry={advice.refetch}>
        {!advice.data ? null : !item ? (
          <EmptyState icon="help-circle-outline" title="Nothing to show" message={`There is no outlook for this in ${region}.`} />
        ) : (
          <View style={{ gap: theme.spacing.xl }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                {region} · {spanLabel(advice.data, isWindow)}
              </Text>
              <Text variant="h1">{ADVICE_LABELS[variable]}</Text>
            </View>

            <Card style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h2">{figureOf(item)}</Text>
                  <Text variant="body" muted>
                    {item.condition === 'normal_only' ? 'In most years' : leanOf(item)}
                  </Text>
                </View>
                {isForecast(item) && item.reading.confidence && item.reading.probabilities ? (
                  <ConfidenceBadge level={item.reading.confidence} />
                ) : null}
              </View>

              {isForecast(item) && item.reading.normalDisplay ? (
                <>
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
                    <Text variant="body" muted>
                      Usual
                    </Text>
                    <Text variant="body">{item.reading.normalDisplay}</Text>
                  </View>
                </>
              ) : null}

              {isForecast(item) && item.reading.probabilities && !item.reading.dryWindow ? (
                <>
                  <Divider />
                  <Text variant="caption" muted>
                    Chances from {item.reading.members ?? 'all'} forecast runs
                  </Text>
                  <ChanceBar variable={variable} probabilities={item.reading.probabilities} />
                </>
              ) : null}
            </Card>

            {item.condition === 'normal_only' ? (
              <Notice tone="warning" title="Usual figure, not a forecast.">
                {`This is too far ahead to forecast. The forecast will be ready from ${formatYearMonth(item.reading.availableFrom) ?? 'a later month'}.`}
              </Notice>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="h2">What to do</Text>
              <Card style={{ gap: theme.spacing.sm }}>
                <Text variant="bodyStrong">{item.title}</Text>
                <BulletList items={item.actions} accent />
                {item.published && advice.data.issuedBy ? (
                  <Text variant="caption" muted>
                    Advice from {advice.data.issuedBy}
                  </Text>
                ) : null}
              </Card>
            </View>

            <LinkRow
              icon="advisories"
              title="Full seasonal advisory"
              subtitle={`Everything for ${region} this season`}
              onPress={() =>
                router.push({
                  pathname: '/seasonal/[region]',
                  params: { region, ...(season ? { season } : {}), ...(window ? { window } : {}) },
                })
              }
            />

            {advice.data.note ? (
              <Text variant="caption" muted>
                {advice.data.note}
              </Text>
            ) : null}
          </View>
        )}
      </AsyncStateView>
    </Screen>
  );
}
