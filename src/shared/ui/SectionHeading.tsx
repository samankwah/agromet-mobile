import React from 'react';
import { View } from 'react-native';

import { Text } from './Text';

/**
 * A section title with an optional line of context beneath it.
 *
 * Sits on the page background with its card (if any) below it, which is what
 * makes a long panel read as a document rather than a stack of boxes.
 *
 * Lived private to `DayDetailScreen` until the subseasonal map's selection
 * panel was rebuilt to read like that screen, which is the second consumer and
 * the point at which this codebase moves a pattern into the shared kit.
 */
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text variant="h2">{title}</Text>
      {subtitle ? (
        <Text variant="caption" muted>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
