import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { pickBlock, regionCell, usualPhrase } from '../../../../shared/api/seasonalService';
import { ADVICE_LABELS, SEASON_WINDOWS, seasonsOf } from '../../../../shared/domain/seasonalAdvice';
import type {
  SeasonChoice,
  SeasonKey,
  SeasonalOutlook,
  SeasonalOutlookSet,
  SeasonalVariableId,
  SummaryValue,
  VariableChoice,
  WindowKey,
} from '../../../../shared/domain/seasonalOutlook';
import { VARIABLE_INFO, WINDOW_LABELS, isSeasonVariable, mainSeasonOf, sectorOf } from '../../../../shared/domain/seasonalOutlook';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { ConfidenceBadge } from '../../../../shared/ui/ConfidenceBadge';
import { Divider } from '../../../../shared/ui/Divider';
import { Text } from '../../../../shared/ui/Text';
import { FactRow, LinkRow } from './AdviceRows';

type Props = {
  set: SeasonalOutlookSet;
  outlook: SeasonalOutlook;
  variableChoice: VariableChoice;
  seasonChoice: SeasonChoice;
  windowKey: WindowKey;
};

/** "later than usual (60%)" -> "Later than usual (60%)". */
function capitalise(text: string | null): string | null {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

/** "March to May" -> "Mar to May". */
function shortWindow(key: WindowKey): string {
  return WINDOW_LABELS[key].replace(/(\w{3})\w* to (\w{3})\w*/, '$1 to $2');
}

/**
 * The reader's own town, in the map's drawer.
 *
 * Shows only what the reader chose on the map. One variable is one sentence
 * and two ways on: the advice for that figure, and the full advisory. All
 * Variables is the season's figures as rows, each opening its own advice, and
 * one way on to the full advisory.
 */
export function SeasonalTownCard({ set, outlook, variableChoice, seasonChoice, windowKey }: Props) {
  const theme = useTheme();
  const region = outlook.region;
  const regionSeasons = seasonsOf(sectorOf(region));
  // The season the advice is for: the one chosen, when this region has it.
  const season: SeasonKey =
    seasonChoice !== 'all' && regionSeasons.includes(seasonChoice) ? seasonChoice : mainSeasonOf(region);
  // The drawer's three months go along only when they fall in that season.
  const window = SEASON_WINDOWS[season].includes(windowKey) ? windowKey : undefined;

  const params = { region, season, ...(window ? { window } : {}) };
  const openFull = () => router.push({ pathname: '/seasonal/[region]', params });
  // A three month figure keeps the drawer's months whatever the season, so the
  // advice page shows the same figure the reader just tapped.
  const openCondition = (variable: SeasonalVariableId) =>
    router.push({
      pathname: '/seasonal/[region]/[variable]',
      params: { ...params, variable, ...(isSeasonVariable(variable) ? {} : { window: windowKey }) },
    });

  const title = `${outlook.townName}, ${region}`;

  if (variableChoice === 'all') {
    const summary = outlook.summary;
    const rain = summary?.windowRows.find((row) => row.variable === 'rainfallTotal')?.values[windowKey];
    const rows: { variable: SeasonalVariableId; label: string; value: SummaryValue }[] = [
      ...(summary?.seasonRows ?? []).map((row) => ({ variable: row.variable, label: ADVICE_LABELS[row.variable], value: row.value })),
      ...(rain ? [{ variable: 'rainfallTotal' as const, label: `Rainfall, ${shortWindow(windowKey)}`, value: rain }] : []),
    ].filter((row) => row.value.text);
    const hasUsual = rows.some((row) => row.value.isNormal);

    return (
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="h3">{title}</Text>
        {rows.length > 0 ? (
          <Card style={{ paddingVertical: theme.spacing.xs }}>
            {rows.map((row, index) => (
              <View key={row.variable}>
                {index > 0 ? <Divider /> : null}
                <FactRow
                  label={row.label}
                  value={row.value.text ?? ''}
                  lean={capitalise(row.value.lean)}
                  isUsual={row.value.isNormal}
                  onPress={() => openCondition(row.variable)}
                  accessibilityHint="Opens what to do about it"
                />
              </View>
            ))}
          </Card>
        ) : null}
        {hasUsual ? (
          <Text variant="caption" muted>
            Grey figures are the usual, not a forecast.
          </Text>
        ) : null}
        <LinkRow icon="advisories" title="Seasonal advisory" subtitle={`What to do this season in ${region}`} onPress={openFull} />
      </View>
    );
  }

  const variable = variableChoice;
  const block = pickBlock(set, variable, isSeasonVariable(variable) ? season : seasonChoice, windowKey);
  const reading = regionCell(block, region)?.[variable];
  const offSeason = isSeasonVariable(variable) && seasonChoice !== 'all' && !regionSeasons.includes(seasonChoice);
  const usual = reading?.normalDisplay ? usualPhrase(variable, reading.normalDisplay) : null;
  // Beyond the model's reach the pinned banner already says when the forecast
  // comes, so the card says only what usually happens.
  const sentence =
    reading && !reading.available && !offSeason
      ? usual
        ? `In most years the ${VARIABLE_INFO[variable].noun} in ${region} is ${usual}.`
        : outlook.plainLanguageSummary
      : outlook.plainLanguageSummary;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <Text variant="h3" style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {outlook.confidenceLevel ? <ConfidenceBadge level={outlook.confidenceLevel} /> : null}
      </View>
      <Text variant="body" muted>
        {sentence}
      </Text>
      {outlook.modelSummary ? (
        <Text variant="caption" muted>
          {outlook.modelSummary}
        </Text>
      ) : null}
      <View style={{ gap: theme.spacing.sm }}>
        {offSeason ? null : (
          <LinkRow
            icon="crop"
            title={`${ADVICE_LABELS[variable]}: what to do`}
            subtitle={`Advice for ${region}`}
            onPress={() => openCondition(variable)}
          />
        )}
        <LinkRow icon="advisories" title="Full seasonal advisory" subtitle={`Everything for ${region} this season`} onPress={openFull} />
      </View>
    </View>
  );
}
