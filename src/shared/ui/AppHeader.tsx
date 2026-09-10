import React from 'react';
import { View } from 'react-native';

import { useMenu } from '../../features/menu/MenuProvider';
import { useTheme } from '../theme/ThemeProvider';
import { MenuButton } from './MenuButton';
import { Text } from './Text';

type Props = {
  /** Optional: Home carries its name in the logo it renders as `left`, so it
   * passes no title rather than printing the same words beside it. */
  title?: string;
  subtitle?: string;
  /**
   * `h1` on the section tabs; Home passes `h2` because its title sits beside a
   * badge and a caption, where `h1` would crowd the row.
   */
  titleVariant?: 'h1' | 'h2';
  /** Rendered before the title — the Home tab's leaf badge, for instance. */
  left?: React.ReactNode;
  /**
   * Fixed colours for a header sitting on the Daily view's photographic
   * backdrop, which is always dark whatever the theme is set to.
   */
  onBackdrop?: { title: string; subtitle: string };
};

/**
 * The header row on the tab screens, and the only home of the menu button.
 *
 * Screen-rendered rather than a navigator option: the tab screens have
 * `headerShown: false` in both `app/_layout.tsx` and `app/(tabs)/_layout.tsx`,
 * so putting the menu button in a navigator header would mean turning headers
 * on for five screens that are designed without them. (Pushed routes do have
 * navigator headers, and the diagnose route sets a `headerRight` there — but
 * they are a different idiom, and none of them carries the menu.)
 */
export function AppHeader({ title, subtitle, left, onBackdrop, titleVariant = 'h1' }: Props) {
  const theme = useTheme();
  const menu = useMenu();

  const titleColor = onBackdrop?.title ?? theme.colors.text;
  const subtitleColor = onBackdrop?.subtitle ?? theme.colors.muted;

  return (
    <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      {left}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant={titleVariant} color={titleColor}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color={subtitleColor}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <MenuButton onPress={menu.open} color={onBackdrop?.title} />
    </View>
  );
}
