import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { clayIcons, type ClayIconName } from './clayIcons';

/**
 * One icon from the 3D set.
 *
 * These are rendered artwork, not glyphs, and that is the whole trade. They
 * carry their own colour, their own lighting and their own baked shadow, which
 * is what gives the app the look the design reference asked for. What they give
 * up is everything a vector had: they cannot be tinted to match a theme or a
 * selected state, they cannot be animated part by part, and they are pixels, so
 * they go soft if drawn much larger than their source.
 *
 * That trade is only worth making for icons that are *content* — the sky
 * condition, a feature on the home grid, a measurement beside a figure. It is a
 * bad trade for control chrome. A chevron, a close cross, a checkmark or a
 * search magnifier has to be crisp at 16dp and has to change colour to show
 * state, so those stay on Ionicons and Phosphor. `ui/DuotoneIcon.tsx` is still
 * the right component for anything that must follow the accent colour.
 *
 * 256px sources, so anything up to about 80dp is safe on a 3x screen. Above
 * that they will soften.
 *
 * Decorative by default, exactly as `ui/DuotoneIcon.tsx` is: every caller in
 * this app writes the same thing in text beside the icon, so announcing it here
 * would read it twice. Pass `label` only where the icon genuinely is the only
 * carrier of the meaning, which should be nowhere.
 */
export function ClayIcon({
  name,
  size = 28,
  style,
  label,
}: {
  name: ClayIconName;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Announce the icon instead of hiding it. Leave unset unless nothing else
   * on screen says what this is. */
  label?: string;
}) {
  const decorative = label === undefined;

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <Image
        source={clayIcons[name]}
        style={{ width: size, height: size }}
        // `contain` rather than the default `cover`: the source art is square
        // with its own padding, and cover would crop the shadow off the bottom
        // of anything laid out in a non-square box.
        resizeMode="contain"
        // The art is already the right size on screen; letting Android pick a
        // lower mip for a 256px source drawn at 28dp is what makes these look
        // fuzzy on a device but fine in a simulator.
        fadeDuration={0}
      />
    </View>
  );
}
