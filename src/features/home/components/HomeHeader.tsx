import React from 'react';
import { Image } from 'react-native';

import { AppHeader } from '../../../shared/ui/AppHeader';

/** The lockup is 1958x679 in assets/agromet-logo.png; the width below is that
 * ratio. Taller than the 36pt badge it replaced: with the app's name and
 * tagline gone from the row, there is nothing beside it to crowd, and it is
 * the only thing on Home that says whose app this is. */
const LOGO_HEIGHT = 48;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 1958) / 679);

/**
 * The real AgroMet logo, alone in the header where a green badge, the app's
 * name and a tagline used to be. The lockup carries the name itself, so
 * printing "AgroMet Ghana" beside it said the same thing twice.
 *
 * It is placed on nothing — no chip, no plate — so the artwork is exactly the
 * file. Worth knowing what that costs: the logo is black linework with a dark
 * red wordmark, and this app's page is near-black, so in the dark theme it
 * reads faintly. A light variant of the logo, or the mark painted in the app's
 * accent, is what would fix that without a plate behind it.
 *
 * It is the only thing naming the app now, so unlike most decorative art here
 * it is announced to a screen reader.
 */
export function HomeHeader() {
  return (
    <AppHeader
      left={
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel="AgroMet Ghana"
          accessibilityIgnoresInvertColors
          source={require('../../../../assets/agromet-logo.png')}
          style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
          resizeMode="contain"
        />
      }
    />
  );
}
