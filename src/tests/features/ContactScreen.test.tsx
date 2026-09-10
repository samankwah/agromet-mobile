import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContactScreen } from '../../features/about/ContactScreen';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <ContactScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/**
 * The body of the POST the form made.
 *
 * Found by method rather than by position: the screen also fetches the FAQ list
 * on mount, so `mock.calls[0]` is not reliably the submission and an index here
 * would silently assert against the wrong request.
 */
function submission() {
  return mockFetch.mock.calls.find(([, init]) => init?.method === 'POST');
}

function submittedBody() {
  const post = submission();
  if (!post) throw new Error('The form did not POST anything.');
  return JSON.parse(post[1].body);
}

/** Fills every field with something valid. */
function fillIn(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    NAME: 'Kofi Mensah',
    EMAIL: 'kofi@example.com',
    PHONE: '',
    SUBJECT: 'Rainfall forecast for Yendi',
    MESSAGE: 'When are the rains expected to start this season?',
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    if (value) fireEvent.changeText(screen.getByLabelText(label), value);
  }
}

function send() {
  fireEvent.press(screen.getByText('Send message'));
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ContactScreen', () => {
  it('is a form to write in, not a list of addresses to copy out', () => {
    renderScreen();

    for (const label of ['NAME', 'EMAIL', 'PHONE', 'SUBJECT', 'MESSAGE']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByText('Send message')).toBeTruthy();
  });

  it('says nothing about errors until the first attempt to send', () => {
    renderScreen();

    // Typing a half-finished address is not a mistake, it is typing.
    fireEvent.changeText(screen.getByLabelText('EMAIL'), 'kofi@');

    expect(screen.queryByText('Check this email address.')).toBeNull();
  });

  it('points out every problem at once when sending an empty form', () => {
    renderScreen();
    send();

    expect(screen.getByText('Tell us who you are.')).toBeTruthy();
    expect(screen.getByText('Give your message a subject.')).toBeTruthy();
    expect(screen.getByText('Write your message.')).toBeTruthy();
    expect(screen.getByText(/email address or a phone number/i)).toBeTruthy();
    expect(submission()).toBeUndefined();
  });

  it('clears an error as soon as it is fixed, rather than on the next attempt', () => {
    renderScreen();
    send();
    expect(screen.getByText('Tell us who you are.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('NAME'), 'Kofi Mensah');

    expect(screen.queryByText('Tell us who you are.')).toBeNull();
  });

  it('posts the message and confirms it arrived', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, message: 'Thank you.', reference: 42 }),
      text: async () => '{"success":true,"reference":42}',
    });

    renderScreen();
    fillIn();
    send();

    expect(await screen.findByText('Message sent')).toBeTruthy();
    expect(screen.getByText('Reference #42')).toBeTruthy();

    expect(submittedBody()).toMatchObject({
      name: 'Kofi Mensah',
      email: 'kofi@example.com',
      subject: 'Rainfall forecast for Yendi',
      source: 'mobile',
    });
  });

  it('omits a blank phone rather than sending an empty string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, reference: 1 }),
      text: async () => '{"success":true}',
    });

    renderScreen();
    fillIn();
    send();

    await screen.findByText('Message sent');
    // '' would satisfy a presence check on the server while being just as
    // unusable as absent.
    expect(submittedBody().phone).toBeUndefined();
  });

  /* The one outcome this screen cannot have. Someone writing in is often
     somewhere with bad signal — that is frequently *why* they are writing — so
     a failed send that also wipes the message would be the worst possible
     moment to lose their words. */
  it('keeps everything typed when the send fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    renderScreen();
    fillIn();
    send();

    await waitFor(() => expect(screen.getByText(/could not reach AgroMet/i)).toBeTruthy());

    expect(screen.getByLabelText('MESSAGE').props.value).toBe(
      'When are the rains expected to start this season?',
    );
    expect(screen.getByLabelText('NAME').props.value).toBe('Kofi Mensah');
    expect(screen.queryByText('Message sent')).toBeNull();
  });

  it('lets someone write a second message without leaving the screen', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, reference: 7 }),
      text: async () => '{"success":true}',
    });

    renderScreen();
    fillIn();
    send();
    await screen.findByText('Message sent');

    fireEvent.press(screen.getByText('Write another message'));

    // A fresh form, not the last one still filled in.
    expect(screen.getByLabelText('NAME').props.value).toBe('');
    expect(screen.getByLabelText('MESSAGE').props.value).toBe('');
  });
});
