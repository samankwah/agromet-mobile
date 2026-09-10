import React from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { useReadAloud } from '../../shared/speech/useReadAloud';

/** A minimal host, so the hook is tested rather than a screen around it. */
function Harness() {
  const { speakingId, toggle, isAvailable } = useReadAloud();

  return (
    <>
      <Text>{isAvailable ? 'available' : 'unavailable'}</Text>
      <Text>{`speaking:${speakingId ?? 'silent'}`}</Text>
      <Pressable accessibilityLabel="one" onPress={() => toggle('one', 'First answer')}>
        <Text>one</Text>
      </Pressable>
      <Pressable accessibilityLabel="two" onPress={() => toggle('two', 'Second answer')}>
        <Text>two</Text>
      </Pressable>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
});

describe('useReadAloud', () => {
  it('speaks the text it is given', async () => {
    render(<Harness />);
    fireEvent.press(screen.getByLabelText('one'));

    expect(Speech.speak).toHaveBeenCalledWith('First answer', expect.objectContaining({ language: 'en' }));
    expect(await screen.findByText('speaking:one')).toBeTruthy();
  });

  it('stops when the same control is tapped again', async () => {
    render(<Harness />);
    fireEvent.press(screen.getByLabelText('one'));
    fireEvent.press(screen.getByLabelText('one'));

    expect(Speech.stop).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('speaking:silent')).toBeTruthy());
  });

  it('never lets two answers talk over each other', () => {
    render(<Harness />);
    fireEvent.press(screen.getByLabelText('one'));
    fireEvent.press(screen.getByLabelText('two'));

    // The second start stops the first rather than layering on top of it.
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledTimes(2);
  });

  /**
   * With a screen reader running the OS already reads the screen. Speaking on
   * top of it means every reply is voiced twice, over itself, and the farmer
   * controls only one of the two voices.
   */
  it('stands down when a screen reader is already speaking', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);

    render(<Harness />);

    await waitFor(() => expect(screen.getByText('unavailable')).toBeTruthy());
  });

  it('stops speaking when the screen goes away', async () => {
    const view = render(<Harness />);
    fireEvent.press(screen.getByLabelText('one'));

    await act(async () => {
      view.unmount();
    });

    // Otherwise the voice follows the farmer to the next screen, with no
    // visible control there to stop it.
    expect(Speech.stop).toHaveBeenCalled();
  });
});
