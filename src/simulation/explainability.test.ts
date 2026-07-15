import { describe, expect, it } from 'vitest';
import type { LogEvent, NeedMemory } from '../types';
import { createInitialState, createNeed } from './engine';
import {
  buildDryRunPlan,
  buildTraversalTimeline,
  filterLogEvents,
  filterMotherRules,
} from './explainability';

const memory = (needName: string, savedLists: string[][], createdAt: number): NeedMemory => ({
  needName,
  activeMemoryWords: savedLists.at(-1) ?? [],
  savedLists,
  successCount: savedLists.length,
  createdAt,
  lastUsedAt: createdAt,
  lastSourceThatWorked: 'base',
});

describe('dry-run traversal explainability', () => {
  it('shows a known Need own-memory-only plan with Base blocked', () => {
    const state = {
      ...createInitialState(0),
      needMemories: { milk: memory('milk', [['more', 'milk']], 1) },
    };

    const result = buildDryRunPlan(state, {
      needName: 'milk',
      triggerWord: 'milk',
      useCurrentMemories: true,
      includeBase: true,
      showWords: true,
    });

    expect(result.knownNeed).toBe(true);
    expect(result.hasOwnActiveMemory).toBe(true);
    expect(result.baseBlocked).toBe(true);
    expect(result.sources.map((source) => source.kind)).toEqual(['own_active']);
    expect(result.sources[0]).toMatchObject({ triggerPresent: true, availableWordCount: 2, skipped: false });
    expect(result.triggerFound).toBe(true);
  });

  it('shows a new Need in active then archived depth-major then Base order', () => {
    const state = {
      ...createInitialState(0),
      needMemories: {
        milk: memory('milk', [['old-milk'], ['shared', 'milk-now']], 1),
        water: memory('water', [['old-water'], ['shared', 'water-now']], 2),
      },
    };

    const result = buildDryRunPlan(state, {
      needName: 'juice',
      triggerWord: 'never',
      useCurrentMemories: true,
      includeBase: true,
      showWords: false,
    });

    expect(result.sources.map((source) => [source.kind, source.sourceNeed, source.depth])).toEqual([
      ['borrowed_active', 'milk', 0],
      ['borrowed_active', 'water', 0],
      ['archived', 'milk', 1],
      ['archived', 'water', 1],
      ['base', null, null],
    ]);
    expect(result.sources[1]).toMatchObject({ skipped: false, originalWordCount: 2, availableWordCount: 1 });
    expect(result.baseWouldBeReached).toBe(true);
    expect(result.triggerFound).toBe(false);
  });

  it('does not claim Mother will deliver when a diagnostic trigger exists without a matching rule', () => {
    const state = { ...createInitialState(0), motherRules: [] };
    const result = buildDryRunPlan(state, {
      needName: 'juice',
      triggerWord: 'juice',
      useCurrentMemories: true,
      includeBase: true,
      showWords: false,
    });

    expect(result.triggerFound).toBe(true);
    expect(result.motherRuleFound).toBe(false);
    expect(result.outcome).toContain('Mother would not schedule delivery');
  });

  it('explains when a trigger is missing from every available source', () => {
    const state = {
      ...createInitialState(0),
      motherRules: [],
      needMemories: { milk: memory('milk', [['more']], 1) },
    };

    const result = buildDryRunPlan(state, {
      needName: 'mystery',
      triggerWord: 'not-anywhere',
      useCurrentMemories: true,
      includeBase: false,
      showWords: true,
    });

    expect(result.motherRuleFound).toBe(false);
    expect(result.triggerFound).toBe(false);
    expect(result.outcome).toContain('exhaust all sources and wait');
  });
});

describe('presentation helpers', () => {
  it('keeps every traversal source representable and identifies a far current source', () => {
    let state = createInitialState(0);
    state = {
      ...state,
      needMemories: {
        first: memory('first', [['one'], ['two']], 1),
        second: memory('second', [['three'], ['four']], 2),
        third: memory('third', [['five'], ['six']], 3),
      },
    };
    state = createNeed(state, { needName: 'new' }, 1, (words) => words);
    state = {
      ...state,
      traversal: {
        ...state.traversal,
        currentIndex: 6,
        tried: state.traversal.plan.slice(0, 6).map((source) => source.id),
        parked: state.traversal.plan.slice(0, 6).map((source) => source.id),
        exhausted: state.traversal.plan.slice(0, 6).map((source) => source.id),
        skipped: [state.traversal.plan[3].id],
      },
    };

    const timeline = buildTraversalTimeline(state);
    expect(timeline).toHaveLength(state.traversal.plan.length);
    expect(timeline[6]).toMatchObject({ status: 'current', isCurrent: true });
    expect(timeline[3]).toMatchObject({ status: 'skipped', skippedBecauseAlreadySpoken: true });
  });

  it('filters Mother rules by need, trigger, item, and enabled text without reordering', () => {
    const rules = createInitialState(0).motherRules.map((rule, index) => ({ ...rule, enabled: index !== 1 }));
    expect(filterMotherRules(rules, 'milk').map((rule) => rule.needName)).toEqual(['milk']);
    expect(filterMotherRules(rules, 'disabled').map((rule) => rule.needName)).toEqual(['water']);
    expect(filterMotherRules(rules, 'give-me-water').length).toBe(0);
    const custom = { ...rules[2], id: 'custom', itemGiven: 'give-me-water' };
    expect(filterMotherRules([...rules, custom], 'give-me-water').map((rule) => rule.id)).toEqual(['custom']);
  });

  it('filters log categories while preserving newest-first ordering', () => {
    const events: LogEvent[] = [
      { id: '1', timestamp: 3, message: 'Skipping source because all words already spoken this run.', type: 'memory' },
      { id: '2', timestamp: 2, message: 'Mother said ok.', type: 'mother' },
      { id: '3', timestamp: 1, message: 'Child spoke “milk”.', type: 'child' },
      { id: '4', timestamp: 0, message: 'Word selected from Base 70-word list: 4 unused words remaining.', type: 'memory' },
    ];

    expect(filterLogEvents(events, 'traversal').map((event) => event.id)).toEqual(['1']);
    expect(filterLogEvents(events, 'mother').map((event) => event.id)).toEqual(['2']);
    expect(filterLogEvents(events, 'child').map((event) => event.id)).toEqual(['3']);
    expect(filterLogEvents(events, 'all').map((event) => event.id)).toEqual(['1', '2', '3', '4']);
  });
});
