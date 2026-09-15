import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/**
 * A rule between sections that sit directly on the background rather than in
 * cards.
 *
 * Two hairlines, not one: a dark line with the light one directly beneath, so
 * the seam reads as a fold in the surface rather than as a line drawn on top
 * of it. Both stay one physical pixel at any density, and on a screen coarse
 * enough to merge them the pair collapses back to the single grey rule this
 * replaced — which is a graceful way to lose.
 */
export function Divider() {
  const theme = useTheme();

  return (
    <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: theme.neu.shadowDark }}>
      <View
        style={{
          position: 'absolute',
          top: StyleSheet.hairlineWidth,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.neu.shadowLight,
        }}
      />
    </View>
  );
}
