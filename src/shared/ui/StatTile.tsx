import React from 'react';
import { View } from 'react-native';
import type { Icon } from 'phosphor-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { DuotoneIcon } from './DuotoneIcon';
import { Surface } from './Surface';
import { Text } from './Text';

type Props = {
  icon: Icon;
  label: string;
  value: string;
  /** Renders flat and unfilled, for a tile on a photographic backdrop. */
  onBackdrop?: boolean;
};

/**
 * The one icon+label+value stat tile in the app — extracted from a
 * function that was private to CurrentConditionsCard so the Forecasts
 * tab's Today section can reuse it instead of re-implementing the same
 * three-line layout a second time.
 *
 * A shallow well rather than a bare row. These tiles always appear as a wrapped
 * grid of four to six inside a card, and in the reference designs a block of
 * readings like that is inlaid into the panel — which also gives each tile an
 * edge, so a 2x3 grid reads as six things instead of one paragraph of numbers.
 *
 * `flat` on a photographic backdrop: see Card's `translucent` note. Passed by
 * the Forecasts Today section, which sits on a photograph.
 */
export function StatTile({ icon, label, value, onBackdrop = false }: Props) {
  const theme = useTheme();

  return (
    <Surface
      depth={onBackdrop ? 'flat' : 'sunken'}
      level="sm"
      radius={theme.radii.md}
      background={onBackdrop ? 'transparent' : theme.colors.bg}
      bordered={!onBackdrop}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        minWidth: '42%',
        flexGrow: 1,
        flexShrink: 1,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <DuotoneIcon icon={icon} size={18} color={theme.colors.muted} />
      <View style={{ flexShrink: 1 }}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </Surface>
  );
}
