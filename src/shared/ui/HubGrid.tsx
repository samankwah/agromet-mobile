import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { Icon } from 'phosphor-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { DuotoneIcon } from './DuotoneIcon';
import { Text } from './Text';

/**
 * The two hub tabs — Advisories and Farm Tools — as a grid of tiles rather than
 * a stack of full-width cards.
 *
 * Both used to be a column of cards carrying a two-line description apiece, so
 * barely two and a half fitted on a phone screen and the descriptions mostly
 * restated their own titles. Two columns of title-and-icon tiles put every
 * destination on one screen, which is what a hub is for.
 *
 * Rows of two rather than one wrapping row of percentage-width children: a row
 * is what settles the odd tile. Farm Tools has five tools, and its fifth simply
 * gets a row to itself, spanning both columns — where a wrapped lone tile would
 * either stretch by accident or sit next to a hole.
 *
 * The grid sits under the header rather than stretching to the bottom of the
 * screen or floating in the middle of it; the tiles carry a minimum height so
 * that still reads as a grid and not as a row of strips.
 */
export function HubGrid({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const tiles = React.Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(tiles.length / 2) }, (_, row) => tiles.slice(row * 2, row * 2 + 2));

  return (
    // `marginTop`: the grid sits a little below the header rather than right
    // under it — on top of the rhythm Screen already puts between its children,
    // so the hub opens with a beat of page before its first tile.
    <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
      {rows.map((row, index) => (
        // The tiles in a row take an equal share of its width, so a row holding
        // one tile stretches that tile across both columns.
        <View key={index} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {row}
        </View>
      ))}
    </View>
  );
}

/** One destination in a hub: its mark, its name, an optional live figure, and
 * the button through to it. */
export function HubTile({
  icon,
  title,
  actionLabel,
  route,
  hint,
  badge,
  linkLabel = 'Take a look',
}: {
  icon: Icon;
  title: string;
  /** The full phrase, e.g. "Open crop advisory". The tile shows "Open" — all
   * a half-width tile has room for — and speaks this instead, so a screen
   * reader hears which one it is rather than four identical tiles. */
  actionLabel: string;
  route: Href;
  /** A live figure from the section itself, when there is one worth showing
   * before the reader taps through. */
  hint?: string;
  /** Count of things wanting attention. Hidden at zero — a permanently lit
   * badge is one nobody reads. */
  badge?: number;
  /** The words on the link, when a tile wants its own — "View advisory" on
   * one that opens a bulletin. Decorative either way; `actionLabel` is what a
   * screen reader hears. */
  linkLabel?: string;
}) {
  const theme = useTheme();

  return (
    // The whole tile is the button, as Home's teaser cards are. Layout stays
    // on the Pressable — it is the flex child of the grid — and the painted
    // chrome stays inside it on the Card, because Android drops a Pressable's
    // own background and border while still drawing its children.
    <Pressable onPress={() => router.push(route)} accessibilityRole="button" accessibilityLabel={actionLabel} style={{ flex: 1 }}>
      {({ pressed }) => (
        // Card intercepts background/border style keys into its SVG
        // silhouette, but padding, gap, opacity and the flex keys pass
        // through — and passthrough is applied over its own base style, so
        // the tighter padding here wins.
        // `minHeight`: a tile shrunk to its two lines of text is a thin strip
        // with a screenful of wallpaper under the grid. This is the height that
        // makes the grid look deliberate under the header — not the whole
        // screen, which stretches four tiles into slabs, and not centred, which
        // only splits the same empty space across both ends.
        //
        // `flexGrow`, not `flex: 1`: the latter also sets a zero flex basis, so
        // the card would claim no height of its own and collapse wherever the
        // grid is not being stretched by its parent. Growing from its natural
        // height fills a tile stretched to match a taller neighbour, without
        // depending on that stretch to have a height at all.
        <Card
          style={{
            flexGrow: 1,
            // Sized for the end user: these are read at arm's length, outdoors,
            // often by someone who is not looking for small print. Everything
            // in the tile is a step up from the app's default scale — the name
            // at h1, the mark at 56, the link at body weight — and the tile is
            // tall enough to hold all three without crowding.
            minHeight: 200,
            padding: theme.spacing.lg,
            gap: theme.spacing.sm,
            opacity: pressed ? 0.75 : 1,
          }}
        >
          {/* Title at the top of the tile, with the badge beside it. */}
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              {/* No numberOfLines: "Advisory archive" already wraps to two
                  lines at this width, and the text-size multiplier can grow
                  it further. */}
              <Text variant="h1" style={{ flex: 1 }}>
                {title}
              </Text>
              {badge ? (
                <View
                  accessibilityLabel={`${badge} needing attention`}
                  style={{
                    minWidth: 28,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 14,
                    backgroundColor: theme.colors.danger,
                    alignItems: 'center',
                  }}
                >
                  <Text variant="bodyStrong" color={theme.colors.onDanger}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            {hint ? (
              <Text variant="body" muted>
                {hint}
              </Text>
            ) : null}
          </View>

          {/* The mark takes the middle of the tile rather than sitting beside
              the title: with the title pinned to the top and the link to the
              bottom, the space between them is the tile's own. Right edge,
              level with that space's centre — growing to fill it is what keeps
              the mark level as titles wrap to one line or two. */}
          <View style={{ flexGrow: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
            <DuotoneIcon icon={icon} size={56} />
          </View>

          {/* The same affordance Home's teaser cards use (home/components/
              TeaserCard.tsx): accent text and a chevron, not a bordered pill.
              An outlined button sized to a half-width tile was the loudest
              thing in it, and it competed with the tile's own edge for the
              same job.

              Decorative: the Pressable above already carries the spoken label,
              so reading this too would announce the tile twice. */}
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
          >
            <Text variant="bodyStrong" color={theme.colors.accent}>
              {linkLabel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}
