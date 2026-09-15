import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { tint } from '../../../shared/theme/blend';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

export type AttachmentAction = 'photos' | 'camera' | 'location' | 'diagnose';

type Tile = {
  action: AttachmentAction;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Which theme colour carries the tile. Each action gets its own so the grid
   * is scannable by colour before the labels are read — the same trick the
   * reference design uses. */
  tone: 'photos' | 'camera' | 'location' | 'document';
  /** Spoken after the label, so a screen reader user learns where a tile leads
   * without having to tap it. Half of these go somewhere other than "attach a
   * file", so saying nothing would be misleading. */
  hint: string;
  disabled?: boolean;
};

const TILES: Tile[] = [
  {
    action: 'photos',
    icon: 'images',
    label: 'Photos',
    tone: 'photos',
    hint: 'Ask about a crop photo',
  },
  {
    action: 'camera',
    icon: 'camera',
    label: 'Camera',
    tone: 'camera',
    hint: 'Photograph a crop and ask about it',
  },
  {
    action: 'location',
    icon: 'location',
    label: 'Location',
    tone: 'location',
    // Says "area" because that is what it adds: the town selected on Home and
    // its region. It never knew the farmer's district, and claiming to was a
    // promise the sentence it writes could not keep.
    hint: 'Add your area to the question',
  },
  {
    action: 'diagnose',
    icon: 'leaf',
    label: 'Diagnose',
    tone: 'document',
    // Was a Document tile that said "Not supported yet" and did nothing but
    // print that sentence. This slot now leads to Crop Diagnose, which is where
    // a photo gets kept, numbered and filed -- the thing the camera in the row
    // above deliberately does not do.
    hint: 'Open the full crop check',
  },
];

const TILE_SIZE = 56;

type Props = {
  onSelect: (action: AttachmentAction) => void;
};

/**
 * The attachment grid that opens under the composer.
 *
 * An inline panel, not a modal bottom sheet — which is why it is not built on
 * the shared `OptionSheet`. Two reasons, and the first is the important one:
 * the composer must stay visible and usable while the panel is open, because
 * the panel's whole job is to put something *into* the message being written.
 * A modal covers the field it is feeding. The second is that `OptionSheet` is
 * the sheet half of a single select — it takes a `selectedId` and returns a
 * chosen value — and this is a menu of actions with no selected state, so
 * borrowing its chrome would mean passing a fake selection for the next reader
 * to puzzle over.
 *
 * Laid out as one row of four rather than a list of rows: circular icon tiles
 * with the label beneath are read as a palette of actions at a glance, where
 * stacked rows read as a form to work down. Four across is also the most that
 * fits at a 44dp target on a 360dp screen.
 */
export function AttachmentPanel({ onSelect }: Props) {
  const theme = useTheme();

  const toneColor: Record<Tile['tone'], string> = {
    // Blue and amber come from the chart pair rather than from `warning`/
    // `danger`: those are status colours, and a status colour on an attachment
    // tile would make picking a document look like an alert.
    photos: theme.colors.chartRain,
    camera: theme.colors.teal,
    location: theme.colors.accent,
    document: theme.colors.chartTemp,
  };

  return (
    <View
      // A palette of actions, announced as one thing so a screen reader user
      // knows the panel opened rather than discovering four loose buttons.
      accessibilityRole="menu"
      // Not "Attach" — that is the button that opens this, and two elements
      // answering to the same name is ambiguous for a screen reader and for
      // anything querying by label.
      accessibilityLabel="Attachment options"
      style={{
        flexDirection: 'row',
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      {TILES.map((tile) => {
        const color = toneColor[tile.tone];

        return (
          <Pressable
            key={tile.action}
            accessibilityRole="menuitem"
            accessibilityLabel={`${tile.label}. ${tile.hint}`}
            accessibilityState={{ disabled: Boolean(tile.disabled) }}
            disabled={tile.disabled}
            onPress={() => onSelect(tile.action)}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              // Chrome on a nested View, never on the Pressable — Android drops
              // a Pressable's own background while still drawing its children.
              <View
                style={{
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  opacity: tile.disabled ? 0.45 : 1,
                }}
              >
                <View
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    borderRadius: TILE_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Blended down to an opaque fill rather than an alpha
                    // suffix — see theme/blend.ts for why the app never leaves
                    // a translucent background on a filled surface.
                    backgroundColor: tint(color, theme.colors.chrome, 0.2),
                    // Round keys on the panel, pressing in when held.
                    boxShadow: pressed ? theme.sunken('sm') : theme.raised('sm'),
                  }}
                >
                  <Ionicons name={tile.icon} size={26} color={color} />
                </View>
                <Text variant="caption" numberOfLines={1}>
                  {tile.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
