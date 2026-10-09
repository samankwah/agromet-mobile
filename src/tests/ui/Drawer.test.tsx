import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from 'react-native';

import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { Drawer } from '../../shared/ui/Drawer';

function renderDrawer(expanded: boolean, onExpandedChange: (next: boolean) => void = () => {}) {
  return render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <Drawer expanded={expanded} onExpandedChange={onExpandedChange} persistentContent={<Text>legend</Text>}>
          <View testID="controls">
            <Text>controls</Text>
          </View>
        </Drawer>
      </ThemeProvider>
    </GestureHandlerRootView>,
  );
}

/**
 * The drawer is a real bottom sheet (`@gorhom/bottom-sheet`) now, not a
 * plain `View` sized by `maxHeight` — so what is worth asserting from plain
 * render-tree tests is its React-level contract: the handle's accessible
 * state and the toggle it fires, and that both the legend and the controls
 * are actually in the tree to be scrolled to. The sheet's own height,
 * snapping and the scroll-to-expand handoff are gesture/layout behaviour
 * gorhom is responsible for and Jest's Node environment cannot lay out —
 * that is what the emulator, not this file, verifies.
 */
describe('Drawer', () => {
  it('keeps both the legend and the controls in the tree, collapsed or expanded', () => {
    // Unlike the old plain-View drawer, the controls are never unmounted on
    // collapse: a scroll gesture has to have something already there to
    // scroll open. Observed as a regression once the controls only rendered
    // after the reader had already expanded the sheet some other way.
    const collapsed = renderDrawer(false);
    expect(collapsed.getByText('legend')).toBeTruthy();
    expect(collapsed.getByTestId('controls')).toBeTruthy();

    const expanded = renderDrawer(true);
    expect(expanded.getByText('legend')).toBeTruthy();
    expect(expanded.getByTestId('controls')).toBeTruthy();
  });

  it('labels the handle by the state it is in, not the state it leads to', () => {
    const { getByLabelText, queryByLabelText } = renderDrawer(false);

    expect(getByLabelText('Expand map controls')).toBeTruthy();
    expect(queryByLabelText('Collapse map controls')).toBeNull();
  });

  it('shows new legend content at once, without the sheet having to move', () => {
    // gorhom does not re-render a footer when only its content changes, which
    // left Probability's key on screen after switching to Deterministic.
    const tree = (legend: string) => (
      <GestureHandlerRootView>
        <ThemeProvider>
          <Drawer expanded={false} onExpandedChange={() => {}} persistentContent={<Text>{legend}</Text>}>
            <View />
          </Drawer>
        </ThemeProvider>
      </GestureHandlerRootView>
    );
    const view = render(tree('probability key'));
    expect(view.getByText('probability key')).toBeTruthy();

    view.rerender(tree('deterministic key'));
    expect(view.getByText('deterministic key')).toBeTruthy();
    expect(view.queryByText('probability key')).toBeNull();
  });

  it('reports the flipped state when the handle is pressed', () => {
    const onExpandedChange = jest.fn();
    const { getByLabelText } = renderDrawer(false, onExpandedChange);

    fireEvent.press(getByLabelText('Expand map controls'));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
