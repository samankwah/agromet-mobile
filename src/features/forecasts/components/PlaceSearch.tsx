import React, { useMemo, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { SearchField } from '../../../shared/ui/SearchField';
import { Text } from '../../../shared/ui/Text';
import { searchPlaces, type Place } from '../subseasonal/places';

type Props = {
  onSelect: (place: Place) => void;
};

/**
 * Find a district or region by name, rather than by hunting for it on a map.
 *
 * Ghana has 260-odd districts over a country that fits on one phone screen, so
 * several are smaller than a fingertip at the default zoom. Tapping was the only
 * way to open a place's detail, which made the small ones effectively
 * unreachable and the rest a game of pinch-and-aim.
 *
 * Results close as soon as one is chosen: leaving a list open over the map after
 * the selection has already been made hides the very thing the reader asked to
 * see.
 */
export function PlaceSearch({ onSelect }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  // Synchronous filter over a list built at module load, so no debounce: there
  // is no request to delay, and adding one would only make typing feel laggy.
  const results = useMemo(() => searchPlaces(query), [query]);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search a district or region"
        accessibilityLabel="Search for a district or region"
      />

      {results.length > 0 ? (
        <View
          style={{
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            overflow: 'hidden',
          }}
        >
          {results.map((place, index) => (
            <Pressable
              key={place.id}
              onPress={() => {
                // Put the keyboard away before handing the selection on: the
                // whole point of choosing a place is to see its chart, and the
                // keyboard covers exactly where that chart appears.
                Keyboard.dismiss();
                setQuery('');
                onSelect(place);
              }}
              accessibilityRole="button"
              accessibilityLabel={place.region ? `${place.name}, ${place.region}` : place.name}
            >
              {/* Chrome on a nested View, never on the Pressable: Android drops
                  it otherwise and the row renders unstyled. */}
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  minHeight: theme.minTouchTarget,
                  justifyContent: 'center',
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text variant="bodyStrong">{place.name}</Text>
                {/* District names repeat across regions, so the region is what
                    tells two identically named results apart. */}
                <Text variant="caption" muted>
                  {place.region ?? 'Region'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
