import type { LogEvent, SimulationState } from '../types';
import { createInitialState } from './engine';

export const STORAGE_KEY = 'the-child-simulator-v2';
export const LEGACY_STORAGE_KEY = 'the-child-simulation-state';

interface PersistedEnvelope {
  schemaVersion: 2;
  savedAt: number;
  state: SimulationState;
}

function hasValidShape(value: unknown): value is SimulationState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<SimulationState>;
  return state.schemaVersion === 2
    && typeof state.isRunning === 'boolean'
    && [1, 10, 60].includes(state.dissatisfactionSpeed ?? 0)
    && Array.isArray(state.speechStream)
    && Boolean(state.needMemories && typeof state.needMemories === 'object' && !Array.isArray(state.needMemories))
    && Array.isArray(state.motherRules)
    && Array.isArray(state.brainLog)
    && Boolean(state.traversal && Array.isArray(state.traversal.plan) && Array.isArray(state.traversal.remainingWords));
}

export function encodePersistedState(state: SimulationState, savedAt = Date.now()): string {
  return JSON.stringify({ schemaVersion: 2, savedAt, state } satisfies PersistedEnvelope);
}

export function decodePersistedState(raw: string, now = Date.now()): { ok: boolean; state?: SimulationState; reason?: string } {
  try {
    const envelope = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (envelope.schemaVersion !== 2 || !hasValidShape(envelope.state)) {
      return { ok: false, reason: 'Incompatible persisted state schema.' };
    }
    const fallback = createInitialState(now);
    const loadedEvent: LogEvent = { id: crypto.randomUUID(), timestamp: now, message: 'Simulator v2 state loaded paused.', type: 'system' };
    const state: SimulationState = {
      ...fallback,
      ...envelope.state,
      schemaVersion: 2,
      isRunning: false,
      traversal: {
        ...envelope.state.traversal,
        cycleCount: envelope.state.traversal.cycleCount ?? 1,
        exhausted: envelope.state.traversal.exhausted ?? [],
        skipped: envelope.state.traversal.skipped ?? [],
      },
      brainLog: [loadedEvent, ...(envelope.state.brainLog ?? [])].slice(0, 250),
      lastRunReport: envelope.state.lastRunReport ?? null,
    };
    return { ok: true, state };
  } catch {
    return { ok: false, reason: 'Persisted state could not be parsed.' };
  }
}
