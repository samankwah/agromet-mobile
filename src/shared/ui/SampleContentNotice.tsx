import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * One quiet line saying the content above is a sample, not something GMet
 * issued.
 *
 * The distinction from `MockDataTag` is the whole point: that badge is wrapped
 * in `__DEV__` and returns null in a release build — so a card of invented
 * content loses its label at exactly the moment it reaches a real extension
 * officer holding the pilot APK. This one ships.
 *
 * It says *what* is unreal rather than "mock data", because "mock" is a
 * developer's word. `features/farm-tools/calendars/components/SampleDataNotice`
 * does the same job at full-card weight for a whole screen of sample calendars;
 * this is the inline, one-line form for a card that sits among real ones.
 */
export function SampleContentNotice({ text }: { text: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1 }}>
      <Ionicons name="information-circle-outline" size={13} color={theme.colors.muted} />
      <Text variant="caption" muted style={{ flexShrink: 1 }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
