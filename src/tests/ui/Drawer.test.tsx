import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { Drawer } from '../../shared/ui/Drawer';

function renderDrawer(expanded: boolean) {
  return render(
    <ThemeProvider>
      <Drawer expanded={expanded} onToggle={() => {}} persistentContent={<Text>legend</Text>}>
        <View testID="controls">
          <Text>controls</Text>
        </View>
      </Drawer>
    </ThemeProvider>,
  );
}

function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

/** The first node in the rendered host tree whose style carries `key`. Reading
 * the tree rather than adding a testID, since nothing else in shared/ui has
 * one and a prop that exists only for a test earns its keep poorly. */
function styleWith(tree: unknown, key: string): Record<string, unknown> | null {
  if (!tree || typeof tree !== 'object') return null;
  const node = tree as { props?: { style?: unknown }; children?: unknown[] };
  const style = flatten(node.props?.style);
  if (style[key] !== undefined) return style;

  for (const child of node.children ?? []) {
    const found = styleWith(child, key);
    if (found) return found;
  }
  return null;
}

/**
 * The drawer is anchored to the bottom of a full-bleed map and grows upward.
 * Uncapped, a tall enough set of controls pushes its own drag handle off the
 * top of the screen, and the handle is the only way to collapse it: the reader
 * is left holding a panel they cannot put down. Observed on the subseasonal map
 * once the detail chart joined the three selectors.
 */
describe('Drawer', () => {
  it('opens far enough to show its content, but never over the whole screen', () => {
    const { toJSON } = renderDrawer(true);
    const style = styleWith(toJSON(), 'maxHeight');

    expect(style).not.toBeNull();
    // A percentage, so it resolves against the drawer's containing block rather
    // than the whole window: measuring the window overshot by the height of the
    // screen header, the cap never bound, and the sheet covered the map
    // entirely -- leaving nothing to tap to dismiss it.
    const maxHeight = style?.maxHeight;
    expect(typeof maxHeight).toBe('string');

    const share = Number(String(maxHeight).replace('%', ''));
    // Both bounds matter: too short and the sheet is a cramped scroll, too tall
    // and there is no map left to tap.
    expect(share).toBeGreaterThan(60);
    expect(share).toBeLessThan(100);
  });

  it('lets the expanded block give way, so a scrolling child gets a bounded box', () => {
    // Without this the cap alone does nothing: the content keeps its natural
    // height and simply overflows the clipped container.
    const { toJSON } = renderDrawer(true);

    expect(styleWith(toJSON(), 'flexShrink')?.flexShrink).toBe(1);
  });

  it('keeps the legend when collapsed and drops the controls', () => {
    const { getByText, queryByTestId } = renderDrawer(false);

    expect(getByText('legend')).toBeTruthy();
    expect(queryByTestId('controls')).toBeNull();
  });
});
