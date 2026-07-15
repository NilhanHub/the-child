import { describe, expect, it } from 'vitest';
import {
  buildFallbackPlan,
  childSpoke,
  clearBrain,
  createInitialState,
  createNeed,
  factoryReset,
  tickState,
} from './engine';
import type { NeedMemory } from '../types';

const memory = (
  needName: string,
  savedLists: string[][],
  createdAt: number,
): NeedMemory => ({
  needName,
  activeMemoryWords: savedLists.at(-1) ?? [],
  savedLists,
  successCount: savedLists.length,
  createdAt,
  lastUsedAt: createdAt,
  lastSourceThatWorked: 'base',
});

describe('fallback traversal', () => {
  it('uses a repeated need own active memory before every fallback', () => {
    const plan = buildFallbackPlan('milk', {
      milk: memory('milk', [['more', 'milk']], 1),
      water: memory('water', [['drink', 'water']], 2),
    }, (words) => words);

    expect(plan.map((entry) => [entry.kind, entry.sourceNeed, entry.depth, entry.words])).toEqual([
      ['own_active', 'milk', 0, ['more', 'milk']],
      ['base', null, null, expect.any(Array)],
    ]);
  });

  it('exhausts a known need own active memory without repeating or activating base', () => {
    let state = createInitialState(0);
    state = {
      ...state,
      needMemories: { milk: memory('milk', [['more', 'again']], 1) },
      motherRules: state.motherRules.map((rule) => ({ ...rule, enabled: false })),
    };
    state = createNeed(state, { needName: 'milk', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };

    state = tickState(state, 1, 2, () => 0);
    state = tickState(state, 1, 3, () => 0);
    state = tickState(state, 1, 4, () => 0);

    expect(state.currentNeed?.currentWordSource).toBe('own_active');
    expect(state.traversal.currentIndex).toBe(0);
    expect(state.traversal.baseReached).toBe(false);
    expect(state.traversal.remainingWords).toEqual([]);
    expect(state.traversal.exhausted).toContain('milk:own:0');
    expect(state.speechStream.map((event) => event.word)).toEqual(['more', 'again']);
    expect(state.childMode).toBe('source_exhausted');
    expect(state.brainLog.map((event) => event.message)).toContain('milk own active memory exhausted; no repeated words allowed in this run.');
    expect(state.brainLog.map((event) => event.message)).toContain('Known Need will not jump to Base because own active memory exists.');
  });

  it('walks other needs depth-first and reaches the base list last', () => {
    const plan = buildFallbackPlan('juice', {
      milk: memory('milk', [['ball', 'mama', 'more', 'milk'], ['more', 'milk'], ['milk']], 1),
      water: memory('water', [['drink', 'water'], ['water']], 2),
    }, (words) => words);

    expect(plan.slice(0, -1).map((entry) => [entry.sourceNeed, entry.depth, entry.words])).toEqual([
      ['milk', 0, ['milk']],
      ['water', 0, ['water']],
      ['milk', 1, ['more', 'milk']],
      ['water', 1, ['drink', 'water']],
      ['milk', 2, ['ball', 'mama', 'more', 'milk']],
    ]);
    expect(plan.at(-1)?.kind).toBe('base');
  });

  it('still advances a new need from borrowed memory to base fallback', () => {
    let state = createInitialState(0);
    state = { ...state, needMemories: { milk: memory('milk', [['milk']], 1) } };
    state = createNeed(state, { needName: 'juice', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };
    state = tickState(state, 1, 2, () => 0);

    expect(state.currentNeed?.currentWordSource).toBe('base');
    expect(state.traversal.baseReached).toBe(true);
  });

  it('skips words already spoken from earlier fallback sources', () => {
    let state = createInitialState(0);
    state = {
      ...state,
      needMemories: { milk: memory('milk', [['shared', 'old'], ['shared', 'milk']], 1) },
      motherRules: state.motherRules.map((rule) => ({ ...rule, enabled: false })),
    };
    state = createNeed(state, { needName: 'juice', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };

    for (let tick = 0; tick < 5; tick += 1) state = tickState(state, 1, tick + 2, () => 0);

    const spoken = state.speechStream.map((event) => event.word);
    expect(spoken.slice(0, 3)).toEqual(['shared', 'milk', 'old']);
    expect(new Set(spoken).size).toBe(spoken.length);
    expect(state.brainLog.some((event) => event.message.includes('Skipping source because all words already spoken this run'))).toBe(false);
    expect(state.currentNeed?.currentWordSource).toBe('base');
  });
});

describe('rules-of-life engine', () => {
  it('rises at one point per minute by default and applies speed only to dissatisfaction', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk' }, 0, (words) => words);
    state = { ...state, isRunning: true, dissatisfactionSpeed: 60 };
    state = tickState(state, 1_000, 1_000);
    expect(state.currentNeed?.dissatisfaction).toBeCloseTo(1);
  });

  it('schedules one bounded Mother delivery and learns only after delivery', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk', actionThreshold: 0 }, 0, (words) => words);
    state = childSpoke({ ...state, isRunning: true }, 'milk', 100, () => 0.5);
    expect(state.pendingDelivery?.totalDelayMs).toBe(10_500);
    expect(state.needMemories.milk).toBeUndefined();

    const duplicate = childSpoke(state, 'milk', 200, () => 0);
    expect(duplicate.pendingDelivery?.totalDelayMs).toBe(10_500);

    state = tickState(duplicate, 10_500, 10_700);
    expect(state.currentNeed?.dissatisfaction).toBe(0);
    expect(state.currentNeed?.status).toBe('satisfied');
    expect(state.isRunning).toBe(false);
    expect(state.needMemories.milk.activeMemoryWords).toEqual(['milk']);
    expect(state.needMemories.milk.savedLists).toEqual([['milk']]);
  });

  it('rejects a word already spoken in the same run', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk' }, 0, (words) => words);
    state = childSpoke(state, 'more', 1, () => 0);
    state = childSpoke(state, 'more', 2, () => 0);

    expect(state.speechStream.map((event) => event.word)).toEqual(['more']);
    expect(state.currentNeed?.wordsSpokenThisRound).toBe(1);
  });

  it('keeps rising and speaking during pending delivery without replacing it, then learns pending words', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk', actionThreshold: 0 }, 0, (words) => words);
    for (let index = 0; index < 18; index += 1) {
      state = childSpoke(state, `before-${index}`, index, () => 0);
    }
    state = childSpoke({ ...state, isRunning: true }, 'milk', 100, () => 0);
    const scheduled = state.pendingDelivery;
    const dissatisfactionAtDetection = state.currentNeed?.dissatisfaction ?? 0;

    state = tickState(state, 1_000, 1_100, () => 0);
    expect(state.pendingDelivery?.timerMs).toBe(8_000);
    expect(state.currentNeed?.dissatisfaction).toBeGreaterThan(dissatisfactionAtDetection);
    expect(state.speechStream.at(-1)?.word).toBe('mama');

    state = childSpoke(state, 'milk', 1_200, () => 1);
    expect(state.pendingDelivery).toMatchObject({
      detectedAt: scheduled?.detectedAt,
      totalDelayMs: scheduled?.totalDelayMs,
      timerMs: 8_000,
    });

    for (let second = 2; second <= 8; second += 1) {
      state = tickState(state, 1_000, second * 1_000, () => 0);
    }
    expect(state.pendingDelivery?.timerMs).toBe(1_000);
    expect(state.speechStream.at(-1)?.word).toBe('down');

    state = tickState(state, 1_000, 9_000, () => 0);
    expect(state.pendingDelivery).toBeNull();
    expect(state.currentNeed?.status).toBe('satisfied');
    expect(state.currentNeed?.dissatisfaction).toBe(0);
    expect(state.needMemories.milk.activeMemoryWords).toHaveLength(20);
    expect(state.needMemories.milk.activeMemoryWords).toEqual(expect.arrayContaining(['mama', 'dada', 'more', 'down']));
  });

  it('waits without repeating when own memory exhausts during Mother pending', () => {
    let state = createInitialState(0);
    state = { ...state, needMemories: { milk: memory('milk', [['milk']], 1) } };
    state = createNeed(state, { needName: 'milk', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };

    state = tickState(state, 1, 2, () => 0);
    expect(state.pendingDelivery).not.toBeNull();
    state = tickState(state, 1, 3, () => 0);
    state = tickState(state, 1, 4, () => 0);

    expect(state.currentNeed?.currentWordSource).toBe('own_active');
    expect(state.traversal.baseReached).toBe(false);
    expect(state.speechStream.map((event) => event.word)).toEqual(['milk']);
    expect(state.childMode).toBe('source_exhausted');
    expect(state.pendingDelivery?.timerMs).toBe(8_998);
    expect(state.currentNeed?.dissatisfaction).toBeGreaterThan(0);
    expect(state.brainLog.map((event) => event.message)).toContain('Child waiting: no unused words remain while Mother pending.');

    state = tickState(state, 8_998, 9_002, () => 0);
    expect(state.pendingDelivery).toBeNull();
    expect(state.needMemories.milk.activeMemoryWords).toEqual(['milk']);
  });

  it('keeps only the last twenty round words in chronological order', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk' }, 0, (words) => words);
    for (let index = 0; index < 25; index += 1) {
      state = childSpoke(state, `word-${index}`, index, () => 0);
    }
    state = childSpoke({ ...state, isRunning: true }, 'milk', 30, () => 0);
    state = tickState(state, 9_000, 9_030);
    expect(state.needMemories.milk.activeMemoryWords).toHaveLength(20);
    expect(state.needMemories.milk.activeMemoryWords[0]).toBe('word-6');
    expect(state.needMemories.milk.activeMemoryWords.at(-1)).toBe('milk');
  });

  it('logs exact saved count and words and retains the final spoken word after satisfaction', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk' }, 0, (words) => words);
    for (let index = 0; index < 24; index += 1) state = childSpoke(state, `word-${index}`, index, () => 0);
    state = childSpoke({ ...state, isRunning: true }, 'milk', 30, () => 0);
    state = tickState(state, 9_000, 9_030);

    const memoryLog = state.brainLog.find((event) => event.message.startsWith('Memory saved for milk:'));
    expect(memoryLog?.message).toBe(
      'Memory saved for milk: saved last 20 of 25 words as milk active memory:\n' +
      'word-5, word-6, word-7, word-8, word-9, word-10, word-11, word-12, word-13, word-14, word-15, word-16, word-17, word-18, word-19, word-20, word-21, word-22, word-23, milk',
    );
    expect(state.speechStream.at(-1)?.word).toBe('milk');
  });

  it('creates a complete Last Run Report when delivery succeeds', () => {
    let state = createNeed(createInitialState(0), { needName: 'milk', actionThreshold: 0 }, 0, (words) => words);
    state = childSpoke({ ...state, isRunning: true }, 'milk', 100, () => 0);
    state = tickState(state, 9_000, 9_100, () => 0);

    expect(state.lastRunReport).toMatchObject({
      needName: 'milk',
      satisfied: true,
      workedFrom: 'base',
      sourceNeed: null,
      triggerWord: 'milk',
      motherDelaySeconds: 9,
      triggerHeardAtWord: 1,
      wordsSpokenTotal: 1,
      uniqueWordsSpoken: 1,
      savedMemoryCount: 1,
      savedWords: ['milk'],
      baseReached: true,
      sourceExhaustionHappened: false,
      noRepeatCausedWaiting: false,
      completedAt: 9_100,
    });
  });

  it('speaks every base word at most once in one run', () => {
    let state = createInitialState(0);
    state = { ...state, motherRules: state.motherRules.map((rule) => ({ ...rule, enabled: false })) };
    state = createNeed(state, { needName: 'unknown', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };
    for (let tick = 0; tick < 75; tick += 1) state = tickState(state, 1, tick + 2, () => 0);

    const words = state.speechStream.map((event) => event.word);
    expect(words).toHaveLength(70);
    expect(new Set(words).size).toBe(70);
    expect(state.childMode).toBe('source_exhausted');
  });

  it('parks an exhausted source and advances to the next list', () => {
    let state = createInitialState(0);
    state = { ...state, needMemories: { milk: memory('milk', [['milk']], 1) } };
    state = createNeed(state, { needName: 'juice', actionThreshold: 0 }, 1, (words) => words);
    state = { ...state, isRunning: true };

    state = tickState(state, 1, 2, () => 0);
    expect(state.speechStream[0]?.word).toBe('milk');
    expect(state.traversal.tried).toHaveLength(1);
    expect(state.traversal.currentIndex).toBe(1);
  });

  it('clear brain keeps Mother rules while factory reset restores defaults', () => {
    let state = createInitialState(0);
    state = {
      ...state,
      needMemories: { milk: memory('milk', [['milk']], 1) },
      motherRules: [{ ...state.motherRules[0], triggerWord: 'bottle' }],
    };
    const cleared = clearBrain(state, 10);
    expect(cleared.needMemories).toEqual({});
    expect(cleared.motherRules[0].triggerWord).toBe('bottle');

    const reset = factoryReset(cleared, 20);
    expect(reset.motherRules[0].triggerWord).toBe('milk');
    expect(reset.brainLog[0].message).toContain('Factory reset');
  });
});
