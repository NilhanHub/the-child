import { describe, expect, it } from 'vitest';
import { createSimulationClock } from './clock';

describe('simulation clock', () => {
  it('uses an external interval and clamps elapsed tick time without changing simulation math', () => {
    const times = [0, 50, 400];
    let callback: (() => void) | undefined;
    let cancelled: number | undefined;
    const ticks: number[] = [];

    const stop = createSimulationClock({
      now: () => times.shift() ?? 400,
      schedule: (next, intervalMs) => {
        expect(intervalMs).toBe(50);
        callback = next;
        return 7;
      },
      cancel: (id) => { cancelled = id; },
      isRunning: () => true,
      onTick: (deltaTimeMs) => ticks.push(deltaTimeMs),
    });

    callback?.();
    callback?.();
    stop();

    expect(ticks).toEqual([50, 250]);
    expect(cancelled).toBe(7);
  });
});
