import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { useReminderAttentionCount } from './reminders/useReminders';

/**
 * Composed screen: Crop Diagnose is a fully working relocated feature —
 * its multi-step flow (crop/stage picker, photo, symptoms, result) gets
 * its own dedicated route (app/diagnose.tsx) rather than being embedded
 * inline here, matching the existing non-tab-route pattern already used
 * for alert details and saved-districts, so it isn't cramped mid-scroll.
 *
 * Every tool is now built, and every one is a ToolCard. Diagnose used to be a
 * bespoke raised card with a filled button and no icon, from when it was the
 * only working tool among placeholders. That emphasis stopped meaning anything
 * once the others shipped and just read as an oversight.
 */
export function FarmToolsScreen() {
  const attention = useReminderAttentionCount();

  return (
    <Screen>
      <Text variant="h1">Farm Tools</Text>

      <ToolCard
        icon="camera-outline"
        title="Diagnose a crop"
        message="Answer a few questions and, if you can, add a photo. You will get decision support on a likely issue."
        actionLabel="Open diagnose"
        route="/diagnose"
      />
      <ToolCard
        icon="calendar-outline"
        title="Crop calendars"
        message="Week-by-week activities for your crop and district, from land preparation through harvest and storage."
        actionLabel="Browse crop calendars"
        route="/calendars/crop"
      />
      <ToolCard
        icon="egg-outline"
        title="Poultry calendars"
        message="Brooding, feeding, vaccination and biosecurity, week by week across the production cycle."
        actionLabel="Browse poultry calendars"
        route="/calendars/poultry"
      />
      <ToolCard
        icon="pricetag-outline"
        title="Market prices and trends"
        message="Commodity prices, six-month trends and when to sell, across Ghana's main market centres."
        actionLabel="Browse market prices"
        route="/market"
      />
      <ToolCard
        icon="checkbox-outline"
        title="Farm reminders"
        message="Tasks you want to be reminded about. Set them yourself, or from a calendar activity or a weather alert."
        actionLabel="Open reminders"
        route="/reminders"
        badge={attention}
      />
    </Screen>
  );
}

/** A built tool: the same row shape the placeholders used, so the
 * screen still reads as one list, but it goes somewhere. */
function ToolCard({
  icon,
  title,
  message,
  actionLabel,
  route,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel: string;
  route: '/diagnose' | '/calendars/crop' | '/calendars/poultry' | '/market' | '/reminders';
  /** Count of things wanting attention. Hidden at zero — a permanently lit
   * badge is one nobody reads. */
  badge?: number;
}) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
        <Text variant="h3" style={{ flex: 1 }}>
          {title}
        </Text>
        {badge ? (
          <View
            accessibilityLabel={`${badge} needing attention`}
            style={{
              minWidth: 22,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 11,
              backgroundColor: theme.colors.danger,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" color={theme.colors.onDanger}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="body" muted>
        {message}
      </Text>
      {/* Outline, not secondary: `secondary` is surfaceStrong with no
          border, which on a surface-coloured card is white on near-white. */}
      <Button label={actionLabel} variant="outline" onPress={() => router.push(route)} />
    </Card>
  );
}
