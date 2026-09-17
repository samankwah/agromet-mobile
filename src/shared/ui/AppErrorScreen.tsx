import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { ClayIcon } from './clay/ClayIcon';
import { Surface } from './Surface';
import { Text } from './Text';

type Props = {
  /** Renders the failed screen again. */
  onRetry: () => Promise<void> | void;
  /** Leaves the failed screen for Home, for an error that retrying cannot fix. */
  onGoHome: () => Promise<void> | void;
};

/**
 * What a farmer sees instead of a white screen when something breaks.
 *
 * Calm on purpose. The app is about weather warnings, so this must not look
 * like one: no red, no warning triangle, no error code. A seedling in a raised
 * medallion, one short heading, one sentence saying their things are safe (the
 * first worry after "it broke" is "did I lose my towns and reminders"), and two
 * ways forward.
 *
 * **Try again** comes first because it usually works: most render errors come
 * from one bad response, and the retry refetches it. **Go to Home** is the way
 * out when the same screen fails again.
 *
 * Both buttons lock while either is running, so a second tap cannot stack a
 * retry on top of a navigation.
 */
export function AppErrorScreen({ onRetry, onGoHome }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const run = (action: () => Promise<void> | void) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <Surface
          depth="raised"
          level="lg"
          radius={48}
          style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}
        >
          <ClayIcon name="crop" size={48} />
        </Surface>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm, maxWidth: 320 }}>
          <Text variant="h2" accessibilityRole="header" style={{ textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            This screen hit a problem. Your towns, reminders and settings are safe.
          </Text>
        </View>

        <View style={{ width: '100%', maxWidth: 320, gap: theme.spacing.sm }}>
          <Button label="Try again" onPress={run(onRetry)} loading={busy} />
          <Button label="Go to Home" variant="outline" onPress={run(onGoHome)} disabled={busy} />
        </View>
      </View>
    </SafeAreaView>
  );
}
