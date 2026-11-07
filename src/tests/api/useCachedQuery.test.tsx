import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { NetworkError } from '../../shared/api/http';
import { ServiceError } from '../../shared/api/mockDelay';
import { useCachedQuery } from '../../shared/api/useCachedQuery';
import { setCached } from '../../shared/storage/cache';
import { createTestQueryClient } from '../testQueryClient';

function wrapperFor() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return Wrapper;
}

/** A request that never settles: the slow connection the option is for. */
const never = () => new Promise<string>(() => {});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useCachedQuery', () => {
  it('shows the saved copy while the first request is still out, when asked to', async () => {
    await setCached('k:accra', 'yesterday');

    const { result } = renderHook(
      () => useCachedQuery({ queryKey: ['k', 'accra'], queryFn: never, cacheKey: 'k:accra', showCachedWhilePending: true }),
      { wrapper: wrapperFor() },
    );

    await waitFor(() => expect(result.current.data).toBe('yesterday'));
    expect(result.current.status).toBe('success');
    expect(result.current.usingCachedFallback).toBe(true);
  });

  it('keeps the skeleton while pending by default', async () => {
    await setCached('k:accra', 'yesterday');

    const { result } = renderHook(() => useCachedQuery({ queryKey: ['k', 'accra'], queryFn: never, cacheKey: 'k:accra' }), {
      wrapper: wrapperFor(),
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.status).toBe('pending');
    expect(result.current.data).toBeUndefined();
  });

  it('does not read the saved copy before the query is enabled', async () => {
    await setCached('k:default', 'wrong town');

    const { result } = renderHook(
      () => useCachedQuery({ queryKey: ['k', 'default'], queryFn: never, cacheKey: 'k:default', enabled: false, showCachedWhilePending: true }),
      { wrapper: wrapperFor() },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.data).toBeUndefined();
  });

  it('swaps the saved copy for the network answer when it arrives', async () => {
    await setCached('k:accra', 'yesterday');
    let answer: (value: string) => void = () => {};
    const pending = new Promise<string>((resolve) => {
      answer = resolve;
    });

    const { result } = renderHook(
      () => useCachedQuery({ queryKey: ['k', 'accra'], queryFn: () => pending, cacheKey: 'k:accra', showCachedWhilePending: true }),
      { wrapper: wrapperFor() },
    );
    await waitFor(() => expect(result.current.data).toBe('yesterday'));

    answer('today');
    await waitFor(() => expect(result.current.data).toBe('today'));
    expect(result.current.usingCachedFallback).toBe(false);
  });

  it('falls back to the saved copy when the server cannot be reached', async () => {
    await setCached('k:accra', 'yesterday');

    const { result } = renderHook(
      () =>
        useCachedQuery({
          queryKey: ['k', 'accra'],
          queryFn: () => Promise.reject(new NetworkError('offline')),
          cacheKey: 'k:accra',
        }),
      { wrapper: wrapperFor() },
    );

    await waitFor(() => expect(result.current.data).toBe('yesterday'));
    expect(result.current.usingCachedFallback).toBe(true);
  });

  it('shows the error, not the saved copy, when the server answered no', async () => {
    await setCached('k:accra', 'yesterday');

    const { result } = renderHook(
      () =>
        useCachedQuery({
          queryKey: ['k', 'accra'],
          queryFn: () => Promise.reject(new ServiceError('gone', 404)),
          cacheKey: 'k:accra',
          showCachedWhilePending: true,
        }),
      { wrapper: wrapperFor() },
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.usingCachedFallback).toBe(false);
  });
});
