import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ComingSoonCard } from '../../shared/ui/ComingSoonCard';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';

/**
 * Composed screen: Crop Diagnose is a fully working relocated feature —
 * its multi-step flow (crop/stage picker, photo, symptoms, result) gets
 * its own dedicated route (app/diagnose.tsx) rather than being embedded
 * inline here, matching the existing non-tab-route pattern already used
 * for alert details and saved-districts, so it isn't cramped mid-scroll
 * alongside stub sections. Calendars/market/reminders are future-milestone
 * sections, shown as ComingSoonCard rows.
 */
export function FarmToolsScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <Text variant="h1">Farm Tools</Text>

      <Card raised style={{ gap: theme.spacing.sm }}>
        <View>
          <Text variant="h3">Diagnose a Crop</Text>
          <Text variant="body" muted>
            Answer a few questions and, if you can, add a photo — get decision support on a likely issue.
          </Text>
        </View>
        <Button
          label="Open Diagnose"
          onPress={() => router.push('/diagnose')}
          icon={<Ionicons name="leaf" size={18} color={theme.colors.onAccent} />}
        />
      </Card>

      <ToolCard
        icon="calendar-outline"
        title="Crop Calendars"
        message="Week-by-week activities for your crop and district — land preparation through harvest and storage."
        actionLabel="Browse crop calendars"
        route="/calendars/crop"
      />
      <ToolCard
        icon="egg-outline"
        title="Poultry Calendars"
        message="Brooding, feeding, vaccination and biosecurity, week by week across the production cycle."
        actionLabel="Browse poultry calendars"
        route="/calendars/poultry"
      />

      <ComingSoonCard icon="pricetag-outline" title="Market prices & trends" message="Commodity prices and seasonal trend charts." />
      <ComingSoonCard icon="checkbox-outline" title="Farm reminders" message="Personal reminders for farm tasks and calendar activities." />
    </Screen>
  );
}

/** A built tool: same shape as the ComingSoonCard rows it replaces, so the
 * screen still reads as one list, but it goes somewhere. */
function ToolCard({
  icon,
  title,
  message,
  actionLabel,
  route,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel: string;
  route: '/calendars/crop' | '/calendars/poultry';
}) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
        <Text variant="h3">{title}</Text>
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
