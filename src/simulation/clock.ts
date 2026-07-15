export interface SimulationClockOptions {
  now: () => number;
  schedule: (callback: () => void, intervalMs: number) => number;
  cancel: (id: number) => void;
  isRunning: () => boolean;
  onTick: (deltaTimeMs: number) => void;
}

export function createSimulationClock(options: SimulationClockOptions, intervalMs = 50): () => void {
  let lastTime = options.now();
  const intervalId = options.schedule(() => {
    const currentTime = options.now();
    const deltaTimeMs = Math.min(250, currentTime - lastTime);
    lastTime = currentTime;
    if (options.isRunning()) options.onTick(deltaTimeMs);
  }, intervalMs);
  return () => options.cancel(intervalId);
}
