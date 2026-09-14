import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Leaf } from 'phosphor-react-native';

import { DuotoneIcon } from '../../shared/ui/DuotoneIcon';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { colors } from '../../shared/theme/tokens';

function renderWithTheme(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('DuotoneIcon', () => {
  /* Phosphor ships 1512 icons behind one barrel export, and the duotone weight
     is the whole reason we took the dependency. If either the barrel or the
     weight map breaks in a future version this fails here rather than as a
     blank card on a device. */
  it('paints the duotone weight from the theme accent', () => {
    const tree = renderWithTheme(<DuotoneIcon icon={Leaf} />);

    const paint: unknown[] = [];
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const element = node as { props?: Record<string, unknown>; children?: unknown[] };
      if (element.props?.fill !== undefined) paint.push(element.props.fill);
      if (element.props?.opacity !== undefined) paint.push(element.props.opacity);
      element.children?.forEach(visit);
    };
    visit(tree.toJSON());

    // react-native-svg parses a colour into an opaque ARGB int before it
    // reaches the native view, so compare against the accent in that form
    // rather than the hex string we passed in.
    const argb = Number(`0xff${colors.light.accent.replace('#', '')}`);

    // Two tones: the accent, plus the same colour dropped back to 0.22 for
    // the shape filled in behind the stroke.
    expect(paint).toContainEqual({ type: 0, payload: argb });
    expect(paint).toContain(0.22);
  });

  /* The card's own title names the same thing, so the glyph must not read out
     as a second, wordless copy of the heading. */
  it('stays hidden from screen readers', () => {
    renderWithTheme(<DuotoneIcon icon={Leaf} />);

    expect(screen.queryByLabelText(/leaf/i)).toBeNull();
  });
});
