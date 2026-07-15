import { describe, expect, it } from 'vitest';
import { createInitialState } from './engine';
import { decodePersistedState, encodePersistedState, STORAGE_KEY } from './persistence';

describe('v2 persistence', () => {
  it('uses the v2 key and reloads simulations paused', () => {
    expect(STORAGE_KEY).toBe('the-child-simulator-v2');
    const encoded = encodePersistedState({ ...createInitialState(0), isRunning: true }, 10);
    const decoded = decodePersistedState(encoded, 20);
    expect(decoded.ok).toBe(true);
    expect(decoded.state?.isRunning).toBe(false);
  });

  it('rejects incompatible or malformed payloads safely', () => {
    expect(decodePersistedState('{"schemaVersion":1}', 0).ok).toBe(false);
    expect(decodePersistedState('not json', 0).ok).toBe(false);
    expect(decodePersistedState(JSON.stringify({ schemaVersion: 2, state: { schemaVersion: 2, motherRules: 'broken' } }), 0).ok).toBe(false);
  });

  it('defaults traversal cycle count when loading an earlier v2 state', () => {
    const original = createInitialState(0);
    const withoutCycle = { ...original, traversal: { ...original.traversal } } as typeof original & { traversal: { cycleCount?: number } };
    delete withoutCycle.traversal.cycleCount;
    const decoded = decodePersistedState(JSON.stringify({ schemaVersion: 2, savedAt: 1, state: withoutCycle }), 2);
    expect((decoded.state?.traversal as { cycleCount?: number })?.cycleCount).toBe(1);
  });

  it('defaults exhausted sources when loading an earlier v2 state', () => {
    const original = createInitialState(0);
    const withoutExhausted = { ...original, traversal: { ...original.traversal } } as typeof original & { traversal: { exhausted?: string[] } };
    delete withoutExhausted.traversal.exhausted;
    const decoded = decodePersistedState(JSON.stringify({ schemaVersion: 2, savedAt: 1, state: withoutExhausted }), 2);
    expect((decoded.state?.traversal as { exhausted?: string[] })?.exhausted).toEqual([]);
  });

  it('defaults Phase 5 explainability fields when loading an earlier v2 state', () => {
    const original = createInitialState(0);
    const older = { ...original, traversal: { ...original.traversal } } as typeof original & {
      lastRunReport?: unknown;
      traversal: { skipped?: string[] };
    };
    delete older.lastRunReport;
    delete older.traversal.skipped;

    const decoded = decodePersistedState(JSON.stringify({ schemaVersion: 2, savedAt: 1, state: older }), 2);

    expect(decoded.state?.lastRunReport).toBeNull();
    expect(decoded.state?.traversal.skipped).toEqual([]);
  });
});
