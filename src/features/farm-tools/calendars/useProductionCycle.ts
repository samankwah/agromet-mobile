import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listProductionCycles,
  startProductionCycle,
  updateProductionCycle,
  type StartCycleInput,
} from '../../../shared/api/calendarService';
import type { ProductionCycle } from '../../../shared/domain/calendar';
import { getCached, setCached } from '../../../shared/storage/cache';

/**
 * `production_cycles` has no user or device column — every cycle any farmer
 * starts is visible to every other. Until the backend grows an owner, this
 * records the ids started on this device and filters the list to them, so
 * "my batches" means mine. Written to survive a backend that later adds a
 * real owner: the filter simply becomes redundant rather than wrong.
 */
const MINE_KEY = 'cycles:mine';

async function readMine(): Promise<string[]> {
  const cached = await getCached<string[]>(MINE_KEY);
  return cached?.value ?? [];
}

async function rememberMine(id: string): Promise<void> {
  const existing = await readMine();
  if (!existing.includes(id)) await setCached(MINE_KEY, [...existing, id]);
}

/**
 * The cycle a farmer is currently running against this calendar, if any.
 *
 * `currentWeek`, `progressPercent` and `expectedEndDate` are read straight
 * off the response and never recomputed on device — the server owns that
 * arithmetic, and a phone with a wrong clock or timezone would otherwise
 * disagree with the dashboard about which week a batch is in.
 */
export function useProductionCycle(calendarId: string | undefined) {
  const queryClient = useQueryClient();
  const [mine, setMine] = useState<string[] | null>(null);

  useEffect(() => {
    readMine().then(setMine);
  }, []);

  const query = useQuery({
    queryKey: ['production-cycles'],
    queryFn: listProductionCycles,
    enabled: Boolean(calendarId) && mine !== null,
  });

  const cycles = (query.data ?? []).filter(
    (cycle) => String(cycle.calendarId) === String(calendarId) && (mine ?? []).includes(String(cycle.id)),
  );

  // The one on screen: the running batch, else the most recently started.
  const active: ProductionCycle | undefined =
    cycles.find((cycle) => cycle.status === 'active') ?? [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

  const start = useMutation({
    mutationFn: (input: StartCycleInput) => startProductionCycle(input),
    onSuccess: async (cycle) => {
      const id = String(cycle.id);
      await rememberMine(id);
      setMine((previous) => (previous?.includes(id) ? previous : [...(previous ?? []), id]));
      queryClient.invalidateQueries({ queryKey: ['production-cycles'] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductionCycle['status'] }) => updateProductionCycle(id, { status }),
    // The server recomputes currentWeek and progressPercent from the new
    // status, so refetch rather than patching the cache optimistically.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production-cycles'] }),
  });

  const reset = useCallback(() => start.reset(), [start]);

  const setStatus = useCallback(
    (status: ProductionCycle['status']) => {
      if (active) update.mutate({ id: String(active.id), status });
    },
    [active, update],
  );

  return {
    cycle: active,
    isLoading: query.isPending && mine !== null,
    start: start.mutate,
    isStarting: start.isPending,
    startError: start.error,
    resetStartError: reset,
    setStatus,
    isUpdating: update.isPending,
  };
}
