import React from 'react';
import { View } from 'react-native';
import type { Icon } from 'phosphor-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { ClayIcon } from './clay/ClayIcon';
import type { ClayIconName } from './clay/clayIcons';
import { DuotoneIcon } from './DuotoneIcon';
import { Surface } from './Surface';
import { Text } from './Text';

type Props = {
  /**
   * Either a name from the 3D set or a Phosphor glyph, and the choice is not
   * stylistic.
   *
   * A tile showing a *measurement* — temperature, humidity, wind, rainfall —
   * takes the 3D icon: the thing being measured has a picture, and the picture
   * is what makes a grid of six readings scannable. A tile showing a
   * *direction* — a price that rose, a range between a min and a max — keeps
   * the Phosphor arrow, because an arrow is not a picture of anything. It means
   * up or down, it has to be read instantly at 18dp, and it is tinted by the
   * caller to say whether up is good news. None of that survives being cast in
   * clay.
   */
  icon: ClayIconName | Icon;
  label: string;
  value: string;
  /**
   * A second, quieter reading under the value, for a figure that belongs to the
   * same measurement rather than to a tile of its own.
   *
   * Home's temperature tile carries the day's range this way. Split across two
   * tiles, "Feels like" and "Min / Max" were two thermometers side by side
   * saying one thing, and the odd count pushed Wind onto a row by itself. Keep
   * it to a few characters: it is a footnote to the value, not a second value.
   */
  hint?: string;
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
export function StatTile({ icon, label, value, hint, onBackdrop = false }: Props) {
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
      {typeof icon === 'string' ? (
        // A touch larger than the Phosphor glyph beside it. A duotone mark at
        // 18dp is a flat silhouette; a render at 18dp is a shaded object that
        // has to give up its detail first, so it needs the extra few points to
        // hold the same visual weight.
        <ClayIcon name={icon} size={22} />
      ) : (
        <DuotoneIcon icon={icon} size={18} color={theme.colors.muted} />
      )}
      <View style={{ flexShrink: 1 }}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
        {hint ? (
          <Text variant="caption" muted numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}
