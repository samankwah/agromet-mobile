import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useChat } from '../../features/chat/useChat';

/**
 * The transcript-persistence half of item 6: `saveChatHistory` must fire once
 * per settled turn, not once per dispatch. A question joins the transcript
 * before it has an answer (`ask`), and `settledMessages()` (chatHistory.ts)
 * already drops any question with no answer under it on load — so a write
 * made while a turn is still pending can never be the thing restored, and
 * used to be pure waste.
 */

jest.mock('../../shared/api/chatService', () => ({
  sendChatMessage: jest.fn(),
}));

jest.mock('../../shared/storage/chatHistory', () => ({
  loadChatHistory: jest.fn(async () => []),
  saveChatHistory: jest.fn(async () => undefined),
  clearChatHistory: jest.fn(async () => undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendChatMessage } = require('../../shared/api/chatService');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { saveChatHistory } = require('../../shared/storage/chatHistory');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat transcript persistence', () => {
  it('writes once per settled turn, not once per dispatch', async () => {
    sendChatMessage.mockResolvedValue({ text: 'Wait for the rains to settle.', degraded: false });

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useChat(), { wrapper });

    // The initial empty-history load also runs through the mocked
    // loadChatHistory and touches nothing worth counting here.
    await waitFor(() => expect(sendChatMessage).not.toHaveBeenCalled());
    saveChatHistory.mockClear();

    await act(async () => {
      result.current.send('When should I plant maize?');
    });
    await waitFor(() => expect(result.current.isSending).toBe(false));

    // One call, for the settled turn — not a second one for the question
    // going up while the reply was still pending.
    expect(saveChatHistory).toHaveBeenCalledTimes(1);
    expect(saveChatHistory.mock.calls[0][0]).toHaveLength(2);

    client.clear();
  });
});
