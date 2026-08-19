import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/**
 * A hairline rule between sections that sit directly on the background
 * rather than in cards. Uses StyleSheet.hairlineWidth so it stays one
 * physical pixel on every density instead of thickening on low-DPI Android
 * screens.
 */
export function Divider() {
  const theme = useTheme();

  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />;
}
