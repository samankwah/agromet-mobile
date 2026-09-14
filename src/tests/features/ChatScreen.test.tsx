import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { router } from 'expo-router';

import { ChatScreen } from '../../features/chat/ChatScreen';
import { MAX_HISTORY_TURNS } from '../../shared/domain/chat';
import { useLocationStore } from '../../shared/state/locationStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// The composer's camera shortcut and its Camera/Photos tiles push to Diagnose.
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

/**
 * Longer than the 5s default, because this screen is heavier to render than the
 * rest of the app: a full-screen SVG wallpaper pattern plus a virtualised list,
 * re-rendered on every send. The tests that drive several exchanges in a row
 * were timing out on the default while still passing on their assertions.
 */
jest.setTimeout(30_000);

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

/**
 * `/api/chat` answers `{ success, message }` with **no `data` key**, so
 * `http.ts`'s unwrap() passes the whole envelope through and chatService reads
 * `.message`. Building replies through this helper keeps that quirk pinned by a
 * test rather than only by a comment — it is the thing most likely to break
 * silently if the envelope handling ever moves into http.ts.
 */
function replyResponse(message: string) {
  return { ok: true, status: 200, json: async () => ({ success: true, message }) } as Response;
}

/** A client per test with retries off — the shared app client retries queries
 * twice, which is right on a phone and wrong here. */
let client: QueryClient;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <ChatScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function ask(question: string) {
  fireEvent.changeText(screen.getByLabelText('Ask AgroMet AI a question'), question);
  // By label: the send control is an icon-only round button, so it has no text
  // to query. That label is the only thing a screen reader gets, which makes
  // asserting through it the right dependency anyway.
  fireEvent.press(screen.getByLabelText('Send'));
}

function bodyOf(callIndex: number) {
  return JSON.parse((mockFetch.mock.calls[callIndex][1] as RequestInit).body as string);
}

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockFetch.mockReset();
  await AsyncStorage.clear();
  useLocationStore.setState({ selectedLocationId: 'accra', hasHydrated: true });
  (router.push as jest.Mock).mockClear();
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

describe('ChatScreen', () => {
  it('introduces itself and offers starter questions before anything is asked', () => {
    renderScreen();

    // The contact header, which is what makes the screen read as a conversation
    // rather than a page.
    expect(screen.getByText('AgroMet AI')).toBeTruthy();
    expect(screen.getByText('online')).toBeTruthy();
    expect(screen.getByLabelText('Ask: When should I plant maize this season?')).toBeTruthy();
  });

  it('groups the transcript by day and shows who spoke', async () => {
    mockFetch.mockResolvedValue(replyResponse('Plant in April.'));
    renderScreen();

    ask('When should I plant?');
    await screen.findByText('Plant in April.');

    // A date separator opens the day, and each bubble names its speaker for a
    // screen reader — alignment and fill carry that visually, and neither is
    // available to TalkBack.
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByLabelText('You: When should I plant?')).toBeTruthy();
    expect(screen.getByLabelText('AgroMet AI: Plant in April.')).toBeTruthy();
  });

  it('sends a starter question and shows the reply', async () => {
    mockFetch.mockResolvedValue(replyResponse('Plant with the first steady rains.'));
    renderScreen();

    fireEvent.press(screen.getByLabelText('Ask: Is the rain coming this week?'));

    expect(await screen.findByText('Plant with the first steady rains.')).toBeTruthy();
    expect(bodyOf(0).message).toBe('Is the rain coming this week?');
  });

  it('shows the question immediately and the answer when it lands', async () => {
    mockFetch.mockResolvedValue(replyResponse('Use certified seed.'));
    renderScreen();

    ask('Which seed should I buy?');

    expect(screen.getByText('Which seed should I buy?')).toBeTruthy();
    expect(await screen.findByText('Use certified seed.')).toBeTruthy();
  });

  it('sends the previous exchange as conversationHistory, in order', async () => {
    // The whole point of the backend patch: without this the assistant answers
    // a follow-up with no antecedent.
    mockFetch
      .mockResolvedValueOnce(replyResponse('Target the start of the rains.'))
      .mockResolvedValueOnce(replyResponse('Maize is similar.'));
    renderScreen();

    ask('When should I plant rice?');
    await screen.findByText('Target the start of the rains.');

    ask('And for maize?');
    await screen.findByText('Maize is similar.');

    expect(bodyOf(0).conversationHistory).toEqual([]);
    expect(bodyOf(1).conversationHistory).toEqual([
      { role: 'user', content: 'When should I plant rice?' },
      { role: 'assistant', content: 'Target the start of the rains.' },
    ]);
  });

  it('caps the history it sends', async () => {
    mockFetch.mockImplementation(async () => replyResponse('Noted.'));
    renderScreen();

    // Each exchange adds two turns, so this comfortably exceeds the cap.
    for (let index = 0; index <= MAX_HISTORY_TURNS; index += 1) {
      ask(`question ${index}`);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(index + 1));
    }

    const lastBody = bodyOf(mockFetch.mock.calls.length - 1);
    expect(lastBody.conversationHistory).toHaveLength(MAX_HISTORY_TURNS);
  });

  it('marks a failed question and retries it without replaying the failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('transport down')).mockResolvedValueOnce(replyResponse('Plant in April.'));
    renderScreen();

    ask('When should I plant?');

    expect(
      await screen.findByText(
        'Could not reach the AgroMet server. Check your connection and try again.',
        {},
        // findBy* defaults to 1s, which this screen's render cost overruns.
        { timeout: 10_000 },
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Plant in April.', {}, { timeout: 10_000 })).toBeTruthy();
    // The failed turn must not appear as a question the assistant ignored.
    expect(bodyOf(1).conversationHistory).toEqual([]);
  });

  it('tells the assistant which region the farmer is looking at', async () => {
    useLocationStore.setState({ selectedLocationId: 'tamale', hasHydrated: true });
    mockFetch.mockResolvedValue(replyResponse('Noted.'));
    renderScreen();

    ask('Is rain coming?');
    await screen.findByText('Noted.');

    expect(bodyOf(0).userContext.region).toBe('Northern');
  });

  it('offers the mic while the field is empty and the send arrow once it is not', () => {
    renderScreen();

    // One slot, whose meaning follows the field — so exactly one of the two is
    // present at any time.
    expect(screen.getByLabelText('Record a voice question')).toBeTruthy();
    expect(screen.queryByLabelText('Send')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Ask AgroMet AI a question'), 'Hello');

    expect(screen.getByLabelText('Send')).toBeTruthy();
    expect(screen.queryByLabelText('Record a voice question')).toBeNull();
  });

  /* The mic used to print "not available yet" and do nothing. It records now,
     and the recording turns into text the farmer can edit. */
  it('starts recording, and offers a way out that does not send', async () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Record a voice question'));

    // The field is replaced while listening: a text box that cannot be typed
    // into would be a control lying about what it does.
    expect(await screen.findByText('Listening…')).toBeTruthy();
    expect(screen.getByLabelText('Cancel recording')).toBeTruthy();
    expect(screen.getByLabelText('Stop recording and use it')).toBeTruthy();
  });

  it('cancelling throws the recording away and asks for nothing', async () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Record a voice question'));
    fireEvent.press(await screen.findByLabelText('Cancel recording'));

    await waitFor(() => expect(screen.queryByText('Listening…')).toBeNull());
    // No transcription was requested, so nothing reached the draft.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('puts the transcript in the draft rather than sending it', async () => {
    // Speech recognition of accented English over a rural connection is not
    // reliable enough to send unread.
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, text: 'When should I plant maize' }),
    });

    renderScreen();
    fireEvent.press(screen.getByLabelText('Record a voice question'));
    fireEvent.press(await screen.findByLabelText('Stop recording and use it'));

    await waitFor(() => expect(screen.getByLabelText('Ask AgroMet AI a question').props.value).toBe('When should I plant maize'));
    // Still the farmer's to send: a send control, not a sent message.
    expect(screen.getByLabelText('Send')).toBeTruthy();
  });

  it('swaps the plus for a keyboard control while the grid is open', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Attach'));
    // One slot, both directions — and the glyph names what tapping it returns
    // you to rather than merely that something closes.
    expect(screen.getByLabelText('Show keyboard')).toBeTruthy();
    expect(screen.queryByLabelText('Attach')).toBeNull();

    fireEvent.press(screen.getByLabelText('Show keyboard'));
    expect(screen.getByLabelText('Attach')).toBeTruthy();
  });

  it('closes the grid as soon as the farmer starts typing', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Attach'));
    fireEvent.changeText(screen.getByLabelText('Ask AgroMet AI a question'), 'When');

    // The grid would otherwise sit open underneath the keyboard it displaced.
    expect(screen.queryByLabelText('Photos. Ask about a crop photo')).toBeNull();
  });

  it('opens the attachment grid on the plus and lists the four options', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Attach'));

    expect(screen.getByLabelText('Camera. Photograph a crop and ask about it')).toBeTruthy();
    expect(screen.getByLabelText('Photos. Ask about a crop photo')).toBeTruthy();
    expect(screen.getByLabelText('Location. Add your area to the question')).toBeTruthy();
    // The fourth slot used to be a Document tile that said "Not supported yet"
    // and did nothing but print that sentence. It leads to the full crop check
    // now, which is somewhere the row's camera deliberately does not go.
    expect(screen.getByLabelText('Diagnose. Open the full crop check')).toBeTruthy();
  });

  it('puts the farmer area into the draft from the Location option', () => {
    useLocationStore.setState({ selectedLocationId: 'tamale', hasHydrated: true });
    renderScreen();

    fireEvent.press(screen.getByLabelText('Attach'));
    fireEvent.press(screen.getByLabelText('Location. Add your area to the question'));

    // The town as well as the region: "near Tamale" narrows an answer that
    // "the Northern region" alone leaves the size of a quarter of Ghana.
    expect(screen.getByLabelText('Ask AgroMet AI a question').props.value).toBe('I am farming near Tamale in the Northern region.');
  });

  it('sends the Diagnose tile to Crop Diagnose, where photos are kept and filed', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Attach'));
    fireEvent.press(screen.getByLabelText('Diagnose. Open the full crop check'));

    expect(router.push).toHaveBeenCalledWith('/diagnose');
  });

  it('announces the reply, once, for screen readers', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    // jest-expo already mocks this method, and jest.spyOn wraps that existing
    // mock rather than a fresh one — so its call history still holds every
    // announcement the earlier tests in this file made. Clear it, or "once"
    // means "once since the suite began".
    announce.mockClear();
    mockFetch.mockResolvedValue(replyResponse('Plant in April.'));
    renderScreen();

    ask('When should I plant?');
    await screen.findByText('Plant in April.');

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Plant in April.');
  });

  it('identifies the device, so the server can meter a route with no login', async () => {
    mockFetch.mockResolvedValue(replyResponse('Plant in April.'));
    renderScreen();

    ask('When should I plant?');
    await screen.findByText('Plant in April.');

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-Device-Id']).toBeTruthy();
  });

  it('passes on what the server says when the quota refuses a question', async () => {
    /* The one refusal where trying again straight away is the wrong move, so
       the server's own words are shown rather than a generic failure. */
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'You are asking faster than AgroMet AI can keep up. Please try again in about 5 minutes.' }),
    } as Response);
    renderScreen();

    ask('When should I plant?');

    expect(await screen.findByText('You are asking faster than AgroMet AI can keep up. Please try again in about 5 minutes.')).toBeTruthy();
  });

  it('renders the steps in an answer as steps', async () => {
    mockFetch.mockResolvedValue(replyResponse('Do this:\n1. Clear the drains\n2. Move the seedlings'));
    renderScreen();

    ask('What should I do before the rain?');

    // Each step is its own line with its own number, rather than one run-on
    // paragraph with the digits buried in it.
    expect(await screen.findByText('Clear the drains')).toBeTruthy();
    expect(screen.getByText('Move the seedlings')).toBeTruthy();
    expect(screen.getByText('1.')).toBeTruthy();
  });

  it('gives back this morning’s conversation, and offers a way to be rid of it', async () => {
    const earlier = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem(
      'agromet:cache:chat-transcript',
      JSON.stringify({
        cachedAt: earlier,
        value: [
          { id: 'q1', role: 'user', text: 'When should I plant?', at: earlier },
          { id: 'a1', role: 'assistant', text: 'Wait for the rains to settle.', at: earlier },
        ],
      }),
    );

    renderScreen();

    expect(await screen.findByText('Wait for the rains to settle.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Start a new conversation'));

    await waitFor(() => expect(screen.queryByText('Wait for the rains to settle.')).toBeNull());
    // Back to the opening turn, which is what an empty conversation looks like.
    expect(screen.getByLabelText('Ask: Is the rain coming this week?')).toBeTruthy();
  });

  it('does not offer to clear a conversation that has not started', () => {
    renderScreen();

    expect(screen.queryByLabelText('Start a new conversation')).toBeNull();
  });

  it('leaves yesterday’s conversation where it is', async () => {
    /* The window is a day because a chat answer is about *now*. Restoring
       "rain on Thursday" cold, two days later, would read as a forecast. */
    const yesterday = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem(
      'agromet:cache:chat-transcript',
      JSON.stringify({
        cachedAt: yesterday,
        value: [{ id: 'a1', role: 'assistant', text: 'Wait for the rains to settle.', at: yesterday }],
      }),
    );

    renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Ask: Is the rain coming this week?')).toBeTruthy());
    expect(screen.queryByText('Wait for the rains to settle.')).toBeNull();
  });
});
