import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { AppErrorScreen } from '../../shared/ui/AppErrorScreen';

function renderScreen(props: { onRetry?: () => Promise<void>; onGoHome?: () => Promise<void> } = {}) {
  const onRetry = props.onRetry ?? jest.fn(async () => {});
  const onGoHome = props.onGoHome ?? jest.fn(async () => {});
  const view = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <ThemeProvider>
        <AppErrorScreen onRetry={onRetry} onGoHome={onGoHome} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { ...view, onRetry, onGoHome };
}

describe('AppErrorScreen', () => {
  it('reassures in plain words, with no error code', () => {
    const { getByText, queryByText } = renderScreen();

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('This screen hit a problem. Your towns, reminders and settings are safe.')).toBeTruthy();
    expect(queryByText(/error|exception|stack/i)).toBeNull();
  });

  it('retries the failed screen', async () => {
    const { getByText, onRetry } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText('Try again'));
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers a way out to Home', async () => {
    const { getByText, onGoHome } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText('Go to Home'));
    });

    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('ignores a second tap while the first action is still running', async () => {
    let finish: () => void = () => {};
    const onRetry = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { getByText, getByRole, onGoHome } = renderScreen({ onRetry });

    await act(async () => {
      fireEvent.press(getByText('Try again'));
    });
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Go to Home' }));
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onGoHome).not.toHaveBeenCalled();

    await act(async () => finish());
  });
});
