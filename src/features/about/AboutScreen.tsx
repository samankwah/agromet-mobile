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

// Each line names where the data really comes from. The app is independent,
// so nothing here may claim an agency as its publisher, and the market line
// says what those prices are rather than where real ones would come from.
const SOURCES = [
  'Daily and weekly forecasts from Open-Meteo, a free public weather service.',
  'Outlooks for the coming weeks from NOAA, the United States weather service.',
  'Crop and poultry advisories, when they are published for your district.',
  'Flood and drought readings from the AgroMet hazard model.',
  "Market prices are examples, not today's prices.",
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
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            // The app mark sits on the page, so it lifts off it like the
            // small square icon tiles in the reference designs.
            boxShadow: theme.raised('md'),
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
          Weather and farming guidance for Ghanaian farmers: what the sky is going to do, what that means for your crop and your district,
          and what to do about it this week.
        </Text>
        <Text variant="body">
          It is built to work on a modest phone and a weak connection. Anything you have already opened stays readable when the signal goes,
          so a forecast you checked in town is still there in the field.
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
          A forecast is a best estimate, not a promise, and an advisory is decision support rather than instruction. Where the stakes are
          high, weigh what you see here against what you see in your own field and what your extension officer advises.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">This build</Text>
        <DetailRow label="Version" value={appVersion()} />
        <DetailRow label="Made by" value="AgroMet Ghana, an independent app. Not an official government app." stacked />
      </Card>
    </Screen>
  );
}
