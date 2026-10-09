import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { buildSummary } from '../../../shared/api/seasonalService';
import { ADVICE_LABELS, seasonsOf, type SeasonalAdvice } from '../../../shared/domain/seasonalAdvice';
import type { SeasonKey, SeasonalOutlookSet, WindowKey } from '../../../shared/domain/seasonalOutlook';
import { SEASON_LABELS, WINDOW_KEYS, sectorOf } from '../../../shared/domain/seasonalOutlook';
import { tint } from '../../../shared/theme/blend';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { Divider } from '../../../shared/ui/Divider';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { figureOf, formatDay, isForecast, leanOf, splitSharedActions } from './adviceText';
import { FactRow } from './components/AdviceRows';
import { useSeasonalAdvice, useSeasonalSet } from './useSeasonalAdvice';

type Props = {
  region: string;
  season?: SeasonKey;
  window?: WindowKey;
};

const SEASON_TABS: Record<SeasonKey, string> = {
  'southern-major': 'Major season',
  'southern-minor': 'Minor season',
  northern: 'Single season',
};

/**
 * One region's season, and what to do about it.
 *
 * Opened from a tap on the seasonal map, or from the town card in its drawer.
 * Read top to bottom it answers, in order: what matters most this season, the
 * figures, what to do, the figures month by month, and how it was worked out.
 *
 * The advice comes from the server (reviewed rules, or text an administrator
 * published). The month by month table comes from the outlook the map already
 * holds, so it shows even when the advice cannot be fetched.
 */
export function SeasonalAdvisoryScreen({ region, season: initialSeason, window }: Props) {
  const theme = useTheme();
  const seasons = seasonsOf(sectorOf(region));
  const [season, setSeason] = useState<SeasonKey>(initialSeason && seasons.includes(initialSeason) ? initialSeason : seasons[0]);
  // The window only applies to the season it was picked for.
  const windowKey = season === (initialSeason ?? seasons[0]) ? window : undefined;

  const advice = useSeasonalAdvice(region, season, windowKey);
  const set = useSeasonalSet();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="h1">{region}</Text>
          <Text variant="body" muted>
            {SEASON_LABELS[season]}
            {advice.data?.season.year ? ` ${advice.data.season.year}` : ''}
          </Text>
        </View>

        {seasons.length > 1 ? (
          <SegmentedControl
            segments={seasons.map((key) => SEASON_TABS[key])}
            selectedIndex={seasons.indexOf(season)}
            onChange={(index) => setSeason(seasons[index])}
            accessibilityLabel="Season"
            equalWidth
          />
        ) : null}

        <AsyncStateView status={advice.status} error={advice.error} onRetry={advice.refetch} skeleton={<AdviceSkeleton />}>
          {advice.data ? (
            <AdviceBody advice={advice.data} region={region} season={season} window={windowKey} stale={advice.usingCachedFallback} />
          ) : null}
        </AsyncStateView>

        {set.data && !set.data.unavailable ? <MonthByMonth set={set.data} region={region} season={season} /> : null}

        {set.data ? <AboutOutlook set={set.data} /> : null}

        {advice.data?.note ? (
          <Text variant="caption" muted>
            {advice.data.note}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function AdviceBody({
  advice,
  region,
  season,
  window,
  stale,
}: {
  advice: SeasonalAdvice;
  region: string;
  season: SeasonKey;
  window?: WindowKey;
  stale: boolean;
}) {
  const theme = useTheme();
  const notForecastYet = advice.conditions.length > 0 && advice.conditions.every((item) => item.condition === 'normal_only');
  const { shared, byVariable } = useMemo(() => splitSharedActions(advice.conditions), [advice.conditions]);
  const openCondition = (variable: string) =>
    router.push({ pathname: '/seasonal/[region]/[variable]', params: { region, variable, season, ...(window ? { window } : {}) } });

  return (
    <View style={{ gap: theme.spacing.xl }}>
      {/* The one thing to know. */}
      <View
        style={{
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
          borderRadius: theme.radii.lg,
          backgroundColor: tint(notForecastYet ? theme.colors.warning : theme.colors.accent, theme.colors.surface, 0.12),
        }}
      >
        <Text variant="h3">{advice.headline}</Text>
        <Text variant="caption" muted>
          {advice.source === 'published' && advice.issuedBy
            ? `Advice from ${advice.issuedBy}`
            : advice.outlookSource === 'gmet' && advice.outlookIssuedBy
              ? `From the forecast issued by ${advice.outlookIssuedBy}`
              : 'From the ECMWF seasonal outlook'}
          {stale ? '. Saved on this phone, may be out of date.' : ''}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="h2">At a glance</Text>
        <Card style={{ paddingVertical: theme.spacing.xs }}>
          {advice.conditions.map((item, index) => (
            <View key={item.variable}>
              {index > 0 ? <Divider /> : null}
              <FactRow
                label={item.variable === 'rainfallTotal' || item.variable === 'rainyDays' || item.variable === 'temperature'
                  ? `${ADVICE_LABELS[item.variable]}, ${shortWindow(advice)}`
                  : ADVICE_LABELS[item.variable]}
                value={figureOf(item)}
                // A usual figure is grey, and the line under the card says
                // what grey means: no label repeated on every row.
                lean={item.condition === 'normal_only' ? null : leanOf(item)}
                isUsual={!isForecast(item)}
                onPress={() => openCondition(item.variable)}
                accessibilityHint="Opens what to do about it"
              />
            </View>
          ))}
        </Card>
        {advice.conditions.some((item) => item.condition === 'normal_only') ? (
          <Text variant="caption" muted>
            {notForecastYet ? 'These are' : 'Grey figures are'} the usual figures for {region}, from 1995 to 2024. Not a forecast.
          </Text>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="h2">What to do</Text>
        {/* One card, one section per figure: seven raised cards in a row read
            as seven separate things to worry about. */}
        <Card style={{ gap: theme.spacing.lg }}>
          {[
            ...advice.conditions
              .map((item) => ({
                key: item.variable,
                // Before the forecast, "Plan for the usual start" under "Rains
                // start" says the same thing twice: the name alone heads it.
                label: item.condition === 'normal_only' ? null : ADVICE_LABELS[item.variable],
                title: item.condition === 'normal_only' ? ADVICE_LABELS[item.variable] : item.title,
                actions: byVariable.get(item.variable) ?? [],
              }))
              .filter((section) => section.actions.length > 0),
            ...(shared.length > 0 ? [{ key: 'shared', label: null, title: 'For the whole season', actions: shared }] : []),
          ].map((section, index) => (
            <View key={section.key} style={{ gap: theme.spacing.sm }}>
              {index > 0 ? <Divider /> : null}
              <View style={{ gap: 2, paddingTop: index > 0 ? theme.spacing.xs : 0 }}>
                {section.label ? (
                  <Text variant="caption" muted>
                    {section.label}
                  </Text>
                ) : null}
                <Text variant="bodyStrong">{section.title}</Text>
              </View>
              <BulletList items={section.actions} accent />
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}

/** "Mar to May" for row labels that share their width with a figure. */
function shortWindow(advice: SeasonalAdvice): string {
  return advice.window.label.replace(/(\w{3})\w* to (\w{3})\w*/, '$1 to $2');
}

/** Rain, rainy days and heat for every three months, from the map's outlook. */
function MonthByMonth({ set, region, season }: { set: SeasonalOutlookSet; region: string; season: SeasonKey }) {
  const theme = useTheme();
  const summary = useMemo(() => buildSummary(set, region, season), [set, region, season]);
  const rows: { label: string; key: (typeof summary.windowRows)[number]['variable'] }[] = [
    { label: 'Rain', key: 'rainfallTotal' },
    { label: 'Rainy days', key: 'rainyDays' },
    { label: 'Heat', key: 'temperature' },
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h2">Month by month</Text>
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1.3 }} />
          {WINDOW_KEYS.map((key) => (
            <Text key={key} variant="caption" muted style={{ flex: 1, textAlign: 'right', fontFamily: theme.fontFamily.bodySemiBold }}>
              {key}
            </Text>
          ))}
        </View>
        {rows.map(({ label, key }) => {
          const row = summary.windowRows.find((entry) => entry.variable === key);
          if (!row) return null;
          return (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="body" style={{ flex: 1.3 }}>
                {label}
              </Text>
              {WINDOW_KEYS.map((window) => {
                const value = row.values[window];
                return (
                  <Text
                    key={window}
                    variant={value.isNormal ? 'body' : 'bodyStrong'}
                    muted={value.isNormal}
                    style={{ flex: 1, textAlign: 'right' }}
                    accessibilityLabel={`${label}, ${window}: ${value.text ?? 'no data'}${value.isNormal ? ', usual figure' : ''}`}
                  >
                    {compact(value.text)}
                  </Text>
                );
              })}
            </View>
          );
        })}
        {summary.hasNormals ? (
          <Text variant="caption" muted>
            Grey figures are the usual, not a forecast. Those months are too far ahead yet.
          </Text>
        ) : null}
      </Card>
    </View>
  );
}

/** "194 mm" and "33.1°C" fit four to a row without their units' spaces. */
function compact(text: string | null): string {
  if (!text) return 'None';
  return text
    .replace(/ mm$/, '')
    .replace(/ days$/, '')
    .replace(/^(\d+(?:\.\d+)?)°C$/, (_, degrees: string) => `${Math.round(Number(degrees))}°`);
}

/** How the outlook was made. Folded away: it is for the curious. */
function AboutOutlook({ set }: { set: SeasonalOutlookSet }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const made = formatDay(set.runDate);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="About this outlook"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: theme.minTouchTarget, gap: theme.spacing.sm }}>
          <Text variant="h3" style={{ flex: 1 }}>
            About this outlook
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" muted>
            A guide to the season, not a day to day forecast. Use it to plan, and follow the Today and 7 day forecasts for what to do
            this week.
          </Text>
          <Text variant="body" muted>
            Figures are for the whole region. The seasonal forecast is too coarse for district detail.
          </Text>
          <Text variant="body" muted>
            The rains start on the first 3 days with 20 mm or more, with no dry spell over 7 days in the month after. A dry day has
            under 1 mm of rain.
          </Text>
          {set.stale ? (
            <Text variant="body" muted>
              This is the last outlook that was made. A newer one is on its way.
            </Text>
          ) : null}
          <Text variant="caption" muted>
            {set.model}. Usual figures from {set.baseline ?? 'the long term record'}.{made ? ` Made ${made}.` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AdviceSkeleton() {
  const theme = useTheme();
  const block = (height: number) => (
    <View style={{ height, borderRadius: theme.radii.lg, backgroundColor: tint(theme.colors.muted, theme.colors.surface, 0.12) }} />
  );
  return (
    <View style={{ gap: theme.spacing.lg }} accessibilityLabel="Loading the seasonal advice">
      {block(88)}
      {block(320)}
      {block(160)}
    </View>
  );
}
