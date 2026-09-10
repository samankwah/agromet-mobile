import React from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../shared/theme/ThemeProvider';
import { BulletList } from '../../shared/ui/BulletList';
import { Card } from '../../shared/ui/Card';
import { DetailRow } from '../../shared/ui/DetailRow';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';

/**
 * What the app is, who runs it, and where its numbers come from.
 *
 * The version is read from `expo-constants` rather than hardcoded, so it cannot
 * disagree with what was actually shipped. Note `jest.setup.js` mocks
 * `expoConfig` as an empty object, so the fallback below is what tests see —
 * and what any build stripped of its config would show, rather than a blank row.
 */
function appVersion(): string {
  return Constants.expoConfig?.version ?? 'in development';
}

const SOURCES = [
  'Forecasts and warnings from the Ghana Meteorological Agency.',
  'Crop and poultry advisories published by agricultural extension officers.',
  'Market prices collected from regional market centres.',
  'Flood and drought readings from the AgroMet hazard model.',
];

export function AboutScreen() {
  const theme = useTheme();

  return (
    <Screen wallpaper>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="leaf" size={26} color={theme.colors.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h2">AgroMet Ghana</Text>
          <Text variant="caption" muted>
            Farm weather at a glance
          </Text>
        </View>
      </View>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">What this app is for</Text>
        <Text variant="body">
          Weather and farming guidance for Ghanaian farmers: what the sky is going to do, what that
          means for your crop and your district, and what to do about it this week.
        </Text>
        <Text variant="body">
          It is built to work on a modest phone and a weak connection. Anything you have already
          opened stays readable when the signal goes, so a forecast you checked in town is still
          there in the field.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">Where the information comes from</Text>
        <BulletList items={SOURCES} />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">A word of caution</Text>
        {/* The same honesty the diagnosis screen carries. A forecast is a
            probability, and an app that implies otherwise costs a farmer a
            harvest. */}
        <Text variant="body">
          A forecast is a best estimate, not a promise, and an advisory is decision support rather
          than instruction. Where the stakes are high, weigh what you see here against what you see
          in your own field and what your extension officer advises.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">This build</Text>
        <DetailRow label="Version" value={appVersion()} />
        <DetailRow label="Published by" value="Ghana Meteorological Agency" stacked />
      </Card>
    </Screen>
  );
}
