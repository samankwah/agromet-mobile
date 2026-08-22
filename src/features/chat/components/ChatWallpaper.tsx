import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '../../../shared/theme/ThemeProvider';

/**
 * The faint doodle pattern behind the transcript.
 *
 * WhatsApp's wallpaper is the single most recognisable thing about its chat, and
 * it does real work: it marks the transcript as a different kind of surface from
 * the rest of the app, so bubbles read as objects sitting on a ground rather
 * than as cards in a list.
 *
 * Ours is drawn from this app's own subject — leaf, sun, cloud, raindrop,
 * seedling, grain — rather than WhatsApp's party of hearts and footballs.
 *
 * Cost is one `<Svg>` with a single tiled `<Pattern>`: one draw call for the
 * whole screen, no images to decode, no per-bubble work. That matters on the
 * low-end Android this app is built for, which is also why the whole thing is
 * static — nothing here animates.
 *
 * Opacity is low on purpose. The pattern must never compete with the text on
 * top of it: at this weight it reads as texture, and a farmer in bright sun
 * simply does not see it, which is the correct failure mode.
 */
const TILE = 84;

export function ChatWallpaper() {
  const theme = useTheme();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="agrometDoodles" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            <G
              stroke={theme.colors.wallpaperInk}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              // Dark schemes need a touch more to register against a near-black
              // ground; light ones need less, or the doodles start to read as
              // dirt on the screen.
              opacity={theme.scheme === 'dark' ? 0.5 : 0.4}
            >
              {/* Leaf, with its midrib */}
              <Path d="M10 14c0-6 5-10 11-10 0 6-5 10-11 10Z" />
              <Path d="M10 14c3-2 6-5 8-8" />

              {/* Sun */}
              <Path d="M62 12a5 5 0 1 0 .01 0" />
              <Path d="M62 3v-2M62 23v2M53 12h-2M73 12h2M56 6l-1.5-1.5M68 18l1.5 1.5M56 18l-1.5 1.5M68 6l1.5-1.5" />

              {/* Raindrop */}
              <Path d="M30 46c0-5 5-9 5-9s5 4 5 9a5 5 0 0 1-10 0Z" />

              {/* Cloud */}
              <Path d="M6 44a4 4 0 0 1 1-7 6 6 0 0 1 11-2 4 4 0 0 1 1 9Z" />

              {/* Seedling in soil */}
              <Path d="M66 48v-8" />
              <Path d="M66 42c-4 0-6-3-6-6 4 0 6 3 6 6Zm0 0c4 0 6-3 6-6-4 0-6 3-6 6Z" />
              <Path d="M60 50h12" />

              {/* Grain head */}
              <Path d="M20 78V64" />
              <Path d="M20 68c-3 0-5-2-5-5 3 0 5 2 5 5Zm0-6c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 6c3 0 5-2 5-5-3 0-5 2-5 5Zm0-6c3 0 5-2 5-5-3 0-5 2-5 5Z" />

              {/* Watering can, roughly */}
              <Path d="M50 76h12v-8H50Z" />
              <Path d="M62 70l6-4v8Z" />
              <Path d="M53 68v-3h4v3" />
            </G>
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#agrometDoodles)" />
      </Svg>
    </View>
  );
}
