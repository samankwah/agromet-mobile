import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { ClayIcon } from '../../../../shared/ui/clay/ClayIcon';
import type { ClayIconName } from '../../../../shared/ui/clay/clayIcons';
import { Text } from '../../../../shared/ui/Text';

type FactRowProps = {
  label: string;
  value: string;
  /** "Later than usual", under the value. */
  lean?: string | null;
  /** The usual figure rather than a forecast: drawn quieter. */
  isUsual?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
};

/**
 * One figure in a list: the name on the left, the figure and its lean on the
 * right. With `onPress` it is a row the reader can open, and gets a chevron.
 */
export function FactRow({ label, value, lean, isUsual, onPress, accessibilityHint }: FactRowProps) {
  const theme = useTheme();
  const body = (
    // Chrome on a nested View, never the Pressable: Android drops it.
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.minTouchTarget + 8,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <View style={{ alignItems: 'flex-end', flexShrink: 1, maxWidth: '62%' }}>
        <Text variant={isUsual ? 'body' : 'bodyStrong'} muted={isUsual} style={{ textAlign: 'right' }}>
          {value}
        </Text>
        {lean ? (
          <Text variant="caption" muted style={{ textAlign: 'right' }}>
            {lean}
          </Text>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${lean ? `, ${lean.toLowerCase()}` : ''}`}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </Pressable>
  );
}

type LinkRowProps = {
  icon: ClayIconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/** A card that opens another screen: icon, title, one line of context, chevron. */
export function LinkRow({ icon, title, subtitle, onPress }: LinkRowProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          minHeight: theme.minTouchTarget + 12,
          paddingVertical: theme.spacing.md,
        }}
      >
        <ClayIcon name={icon} size={32} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{title}</Text>
          {subtitle ? (
            <Text variant="caption" muted>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Card>
    </Pressable>
  );
}
