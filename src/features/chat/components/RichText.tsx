import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { parseRichText, type InlineSpan } from '../richText';

type Props = {
  text: string;
  /** Overrides the bubble's text colour where the ground demands it. */
  color?: string;
};

/**
 * An assistant reply, with its steps as steps.
 *
 * Built out of `ui/Text` and the theme rather than a markdown library, for the
 * reason `formatReplyText` gave when it rejected one: a renderer that arrives
 * with its own type scale and its own colours is a second design system inside
 * a bubble. This one has no opinions of its own -- every size, weight and space
 * comes from the same tokens the rest of the app uses.
 *
 * Bold is `fontFamily`, not `fontWeight`. The app loads Noto Sans in two named
 * cuts and Android picks a font by family name; `fontWeight: 'bold'` on a
 * loaded custom family gets synthesised or ignored depending on the device,
 * which is how one phone shows emphasis and another shows none.
 */
export function RichText({ text, color }: Props) {
  const theme = useTheme();
  const blocks = parseRichText(text);

  // A plain answer stays a plain `Text`, with no wrapper around it. That is not
  // a micro-optimisation: the bubble lays its text and its timestamp out as
  // wrapping row children so the time can share the last line when it fits, and
  // a View in that row would take the full width and push the time onto a line
  // of its own. Most replies are one paragraph, so most replies keep the tidier
  // shape, and only an answer that actually has steps in it spends the line.
  const [only] = blocks;
  if (blocks.length <= 1 && (!only || only.kind === 'paragraph')) {
    return (
      <Text variant="body" color={color} style={{ flexShrink: 1 }}>
        {only ? <Spans spans={only.spans} /> : null}
      </Text>
    );
  }

  return (
    <View style={{ flexShrink: 1, width: '100%' }}>
      {blocks.map((block, index) => {
        const spacing = index === 0 ? 0 : block.kind === 'paragraph' ? theme.spacing.sm : theme.spacing.xs;

        if (block.kind === 'paragraph') {
          return (
            <Text key={index} variant="body" color={color} style={{ marginTop: spacing }}>
              <Spans spans={block.spans} />
            </Text>
          );
        }

        // The mark sits in its own column so a wrapped step lines up under its
        // own words rather than under the number. A hanging indent is the whole
        // reason a list reads faster than a paragraph.
        const mark = block.kind === 'bullet' ? '•' : block.label;

        return (
          <View key={index} style={{ flexDirection: 'row', marginTop: spacing, paddingRight: theme.spacing.xs }}>
            <Text variant="body" color={color} style={{ minWidth: block.kind === 'bullet' ? 14 : 22 }}>
              {mark}
            </Text>
            <Text variant="body" color={color} style={{ flexShrink: 1 }}>
              <Spans spans={block.spans} />
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Spans({ spans }: { spans: InlineSpan[] }) {
  const theme = useTheme();

  return (
    <>
      {spans.map((span, index) =>
        span.bold ? (
          <Text key={index} style={{ fontFamily: theme.fontFamily.bodySemiBold }}>
            {span.text}
          </Text>
        ) : (
          <Text key={index}>{span.text}</Text>
        ),
      )}
    </>
  );
}
