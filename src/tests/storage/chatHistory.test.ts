import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage } from '../../shared/domain/chat';
import { clearChatHistory, isWithinRetention, loadChatHistory, saveChatHistory, settledMessages } from '../../shared/storage/chatHistory';

const HOUR = 60 * 60 * 1000;

function message(overrides: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    role: 'user',
    text: 'When should I plant maize?',
    at: new Date().toISOString(),
    ...overrides,
  };
}

function exchange(id: string, at: string): ChatMessage[] {
  return [message({ id: `${id}-q`, at }), message({ id: `${id}-a`, role: 'assistant', text: 'Wait for the rains to settle.', at })];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the chat transcript on disk', () => {
  it('gives back a conversation from earlier the same day', async () => {
    const earlier = new Date(Date.now() - 3 * HOUR).toISOString();
    await saveChatHistory(exchange('one', earlier));

    const restored = await loadChatHistory();

    expect(restored.map((entry) => entry.id)).toEqual(['one-q', 'one-a']);
  });

  it('drops a conversation older than a day', async () => {
    /* The whole reason for the window: chat answers are about *now*, and a
       two-day-old "rain on Thursday" restored cold reads as a forecast. */
    const yesterday = new Date(Date.now() - 30 * HOUR).toISOString();
    await saveChatHistory(exchange('old', yesterday));

    expect(await loadChatHistory()).toEqual([]);
  });

  it('keeps the timestamps it was given, so the transcript can date them', async () => {
    const earlier = new Date(Date.now() - 5 * HOUR).toISOString();
    await saveChatHistory(exchange('one', earlier));

    const [restored] = await loadChatHistory();

    expect(restored.at).toBe(earlier);
  });

  it('forgets everything on request', async () => {
    await saveChatHistory(exchange('one', new Date().toISOString()));

    await clearChatHistory();

    expect(await loadChatHistory()).toEqual([]);
  });

  it('survives a corrupt entry rather than throwing on launch', async () => {
    await AsyncStorage.setItem('agromet:cache:chat-transcript', '{ not json');

    expect(await loadChatHistory()).toEqual([]);
  });

  it('ignores an entry that is not a message', async () => {
    await AsyncStorage.setItem(
      'agromet:cache:chat-transcript',
      JSON.stringify({ value: [null, 42, { id: 'ok', role: 'user', text: 'hi', at: new Date().toISOString() }] }),
    );

    expect((await loadChatHistory()).map((entry) => entry.id)).toEqual(['ok']);
  });
});

describe('what is worth keeping', () => {
  it('keeps whole exchanges', () => {
    const kept = settledMessages(exchange('one', new Date().toISOString()));

    expect(kept).toHaveLength(2);
  });

  it('drops a question that was still waiting when the app closed', () => {
    /* Restoring it would show a question that reads as ignored, under a Try
       again button for a send whose moment has passed. */
    const now = new Date().toISOString();
    const kept = settledMessages([...exchange('one', now), message({ id: 'in-flight', at: now })]);

    expect(kept.map((entry) => entry.id)).toEqual(['one-q', 'one-a']);
  });

  it('drops a question that failed', () => {
    const now = new Date().toISOString();
    const kept = settledMessages([
      ...exchange('one', now),
      message({ id: 'failed', at: now, failed: true, errorText: 'Could not reach the AgroMet server.' }),
    ]);

    expect(kept.map((entry) => entry.id)).toEqual(['one-q', 'one-a']);
  });

  it('caps a very long conversation', () => {
    const now = new Date().toISOString();
    const many = Array.from({ length: 150 }, (_, index) => exchange(`e${index}`, now)).flat();

    expect(settledMessages(many)).toHaveLength(200);
  });
});

describe('the retention window', () => {
  it('accepts a message from an hour ago', () => {
    expect(isWithinRetention(new Date(Date.now() - HOUR).toISOString())).toBe(true);
  });

  it('rejects one from two days ago', () => {
    expect(isWithinRetention(new Date(Date.now() - 48 * HOUR).toISOString())).toBe(false);
  });

  it('keeps a message stamped slightly in the future', () => {
    /* A clock that has been changed, not a message from tomorrow. Dropping it
       would silently eat a conversation the farmer is still having. */
    expect(isWithinRetention(new Date(Date.now() + HOUR).toISOString())).toBe(true);
  });

  it('rejects a timestamp it cannot read', () => {
    expect(isWithinRetention('not a date')).toBe(false);
  });
});
