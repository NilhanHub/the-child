import { BASE_WORDS, DEFAULT_NEED, DEFAULT_RULES } from '../constants';
import type {
  FallbackSource,
  LogEvent,
  MotherRule,
  Need,
  NeedMemory,
  SimulationState,
  WordSourceKind,
} from '../types';

export type Shuffle = (words: string[]) => string[];

const keyFor = (value: string) => value.trim().toLowerCase();
const uuid = () => crypto.randomUUID();
const log = (message: string, type: LogEvent['type'], now: number): LogEvent => ({ id: uuid(), timestamp: now, message, type });
const pushLogs = (state: SimulationState, ...events: LogEvent[]): LogEvent[] => [...events, ...state.brainLog].slice(0, 250);
const cloneRules = () => DEFAULT_RULES.map((rule) => ({ ...rule }));
const emptyTraversal = () => ({ plan: [], currentIndex: 0, cycleCount: 1, remainingWords: [], tried: [], parked: [], exhausted: [], skipped: [], baseReached: false });

const uniqueWords = (words: readonly string[]): string[] => {
  const seen = new Set<string>();
  return words.reduce<string[]>((result, rawWord) => {
    const word = keyFor(rawWord);
    if (!word || seen.has(word)) return result;
    seen.add(word);
    result.push(word);
    return result;
  }, []);
};

const unusedWords = (words: readonly string[], state: SimulationState): string[] => {
  const spoken = new Set(state.speechStream.map((event) => keyFor(event.word)));
  return uniqueWords(words).filter((word) => !spoken.has(word));
};

const appendUnique = (values: string[], ...items: string[]): string[] => [...new Set([...values, ...items])];

const shuffleWithRandom = (words: string[], random: () => number): string[] => {
  const copy = [...words];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

export const shuffleWords: Shuffle = (words) => shuffleWithRandom(words, Math.random);

export function createInitialState(now = Date.now()): SimulationState {
  return {
    schemaVersion: 2,
    isRunning: false,
    dissatisfactionSpeed: 1,
    currentNeed: null,
    childMode: 'waiting',
    speechStream: [],
    needMemories: {},
    motherRules: cloneRules(),
    pendingDelivery: null,
    motherStatus: { phase: 'listening', message: 'Listening for the Child', item: null },
    traversal: emptyTraversal(),
    nextWordInMs: 0,
    brainLog: [log('Simulator v2 initialized. Mother is listening.', 'system', now)],
    lastRunReport: null,
  };
}

export function buildFallbackPlan(
  needName: string,
  memories: Record<string, NeedMemory>,
  shuffle: Shuffle = shuffleWords,
): FallbackSource[] {
  const target = keyFor(needName);
  const own = memories[target];
  if (own?.activeMemoryWords.length) {
    return [
      { id: `${target}:own:0`, kind: 'own_active', sourceNeed: own.needName, depth: 0, words: shuffle(uniqueWords(own.activeMemoryWords)), label: `${own.needName} own active memory` },
      { id: 'base:70', kind: 'base', sourceNeed: null, depth: null, words: shuffle([...BASE_WORDS]), label: 'Base 70-word list' },
    ];
  }

  const known = Object.entries(memories)
    .filter(([key, memory]) => key !== target && memory.activeMemoryWords.length > 0)
    .sort(([, left], [, right]) => left.createdAt - right.createdAt);
  const plan: FallbackSource[] = [];
  const maxHistory = Math.max(0, ...known.map(([, memory]) => memory.savedLists.length));

  for (let depth = 0; depth < maxHistory; depth += 1) {
    for (const [key, memory] of known) {
      const historyIndex = memory.savedLists.length - 1 - depth;
      if (historyIndex < 0) continue;
      const words = depth === 0 ? memory.activeMemoryWords : memory.savedLists[historyIndex];
      if (!words.length) continue;
      const kind: WordSourceKind = depth === 0 ? 'borrowed_active' : 'archived';
      plan.push({
        id: `${key}:${kind}:${depth}`,
        kind,
        sourceNeed: memory.needName,
        depth,
        words: shuffle(uniqueWords(words)),
        label: depth === 0 ? `${memory.needName} active memory` : `${memory.needName} archived depth ${depth}`,
      });
    }
  }

  plan.push({ id: 'base:70', kind: 'base', sourceNeed: null, depth: null, words: shuffle(uniqueWords(BASE_WORDS)), label: 'Base 70-word list' });
  return plan;
}

const sourceMode = (kind: WordSourceKind): Need['currentMemoryMode'] =>
  kind === 'own_active' ? 'own' : kind === 'borrowed_active' ? 'borrowed' : kind === 'archived' ? 'archived' : 'base';

export function createNeed(
  state: SimulationState,
  input: Partial<Need>,
  now = Date.now(),
  shuffle: Shuffle = shuffleWords,
): SimulationState {
  const needName = (input.needName || DEFAULT_NEED.needName).trim() || DEFAULT_NEED.needName;
  const plan = buildFallbackPlan(needName, state.needMemories, shuffle);
  const first = plan[0];
  const need: Need = {
    id: uuid(),
    needName,
    dissatisfaction: 0,
    dissatisfactionRisePerMinute: Math.max(0.01, Number(input.dissatisfactionRisePerMinute ?? DEFAULT_NEED.dissatisfactionRisePerMinute)),
    actionThreshold: Math.max(0, Number(input.actionThreshold ?? DEFAULT_NEED.actionThreshold)),
    maxDissatisfaction: 100,
    status: 'active',
    wordsSpokenThisRound: 0,
    currentWordSource: first.kind,
    currentMemoryMode: sourceMode(first.kind),
    sourceNeed: first.sourceNeed,
    fallbackDepth: first.depth,
  };
  const fallbackStarted = first.kind !== 'own_active' && first.kind !== 'base';
  return {
    ...state,
    isRunning: false,
    currentNeed: need,
    childMode: 'rising',
    pendingDelivery: null,
    motherStatus: { phase: 'listening', message: 'Listening for the Child', item: null },
    traversal: { plan, currentIndex: 0, cycleCount: 1, remainingWords: [...first.words], tried: [], parked: [], exhausted: [], skipped: [], baseReached: first.kind === 'base' },
    speechStream: [],
    nextWordInMs: 0,
    brainLog: pushLogs(
      state,
      log(`Need created: ${needName}. Rise ${need.dissatisfactionRisePerMinute}/min; threshold ${need.actionThreshold}.`, 'need', now),
      ...(fallbackStarted ? [log(`Fallback traversal started with ${first.label}.`, 'memory', now)] : []),
      ...(first.kind === 'own_active' ? [log(`Known Need memory loop active: staying inside ${needName} own active memory.`, 'memory', now)] : []),
      log(`Word source selected: ${first.label}${first.kind === 'own_active' ? ', cycle 1' : ''}.`, 'memory', now),
    ),
  };
}

export function childSpoke(
  state: SimulationState,
  rawWord: string,
  now = Date.now(),
  random: () => number = Math.random,
): SimulationState {
  if (!state.currentNeed) return state;
  const word = keyFor(rawWord);
  if (state.speechStream.some((event) => keyFor(event.word) === word)) return state;
  const event = { id: uuid(), word, timestamp: now };
  let next: SimulationState = {
    ...state,
    currentNeed: { ...state.currentNeed, wordsSpokenThisRound: state.currentNeed.wordsSpokenThisRound + 1 },
    speechStream: [...state.speechStream, event].slice(-100),
    childMode: 'speaking',
    brainLog: pushLogs(state, log(`Child spoke “${word}”.`, 'child', now)),
  };
  if (state.pendingDelivery) return next;
  const rule = getMatchingRules(state).find((candidate) => keyFor(candidate.triggerWord) === word);
  if (!rule) return next;
  const min = Math.min(rule.minDelaySeconds, rule.maxDelaySeconds);
  const max = Math.max(rule.minDelaySeconds, rule.maxDelaySeconds);
  const totalDelayMs = (min + random() * (max - min)) * 1_000;
  next = {
    ...next,
    pendingDelivery: { needId: state.currentNeed.id, triggerWord: rule.triggerWord, itemGiven: rule.itemGiven, timerMs: totalDelayMs, totalDelayMs, detectedAt: now },
    childMode: 'delivery_pending',
    motherStatus: { phase: 'preparing', message: `Correct word detected. Preparing ${rule.itemGiven}.`, item: rule.itemGiven },
    brainLog: pushLogs(next,
      log(`Mother detected correct word “${word}”.`, 'mother', now),
      log(`Mother scheduled ${rule.itemGiven} in ${(totalDelayMs / 1_000).toFixed(1)} seconds.`, 'mother', now),
    ),
  };
  return next;
}

function completeDelivery(state: SimulationState, now: number): SimulationState {
  if (!state.pendingDelivery || !state.currentNeed) return state;
  const need = state.currentNeed;
  const key = keyFor(need.needName);
  const words = state.speechStream.slice(-20).map((event) => event.word);
  const existing = state.needMemories[key] ?? {
    needName: need.needName,
    activeMemoryWords: [],
    savedLists: [],
    successCount: 0,
    createdAt: now,
    lastUsedAt: now,
    lastSourceThatWorked: need.currentWordSource,
  };
  const learned: NeedMemory = {
    ...existing,
    activeMemoryWords: words,
    savedLists: [...existing.savedLists, words],
    successCount: existing.successCount + 1,
    lastUsedAt: now,
    lastSourceThatWorked: need.currentWordSource,
  };
  const triggerIndex = state.speechStream.findIndex((event) => keyFor(event.word) === keyFor(state.pendingDelivery?.triggerWord ?? ''));
  return {
    ...state,
    isRunning: false,
    currentNeed: { ...need, dissatisfaction: 0, status: 'satisfied' },
    childMode: 'learning_saved',
    pendingDelivery: null,
    motherStatus: { phase: 'item_given', message: `Mother said “ok” and gave ${state.pendingDelivery.itemGiven}.`, item: state.pendingDelivery.itemGiven },
    needMemories: { ...state.needMemories, [key]: learned },
    lastRunReport: {
      needName: need.needName,
      satisfied: true,
      workedFrom: need.currentWordSource,
      sourceNeed: need.sourceNeed,
      triggerWord: state.pendingDelivery.triggerWord,
      motherDelaySeconds: state.pendingDelivery.totalDelayMs / 1_000,
      triggerHeardAtWord: triggerIndex >= 0 ? triggerIndex + 1 : null,
      wordsSpokenTotal: need.wordsSpokenThisRound,
      uniqueWordsSpoken: new Set(state.speechStream.map((event) => keyFor(event.word))).size,
      savedMemoryCount: words.length,
      savedWords: words,
      baseReached: state.traversal.baseReached,
      sourceExhaustionHappened: state.traversal.exhausted.length > 0,
      noRepeatCausedWaiting: state.childMode === 'source_exhausted',
      completedAt: now,
    },
    brainLog: pushLogs(state,
      log('Mother said “ok”.', 'mother', now),
      log(`Mother gave ${state.pendingDelivery.itemGiven}; dissatisfaction reset to 0.`, 'mother', now),
      log(`Memory saved for ${need.needName}: saved last ${words.length} of ${need.wordsSpokenThisRound} words as ${need.needName} active memory:\n${words.join(', ') || '(no words)'}`, 'memory', now),
      log(`${need.needName} active memory updated from ${need.currentWordSource}.`, 'memory', now),
    ),
  };
}

function advanceTraversal(state: SimulationState, now: number): SimulationState {
  const current = state.traversal.plan[state.traversal.currentIndex];
  if (!current) return state;
  const currentAlreadyExhausted = state.traversal.exhausted.includes(current.id);
  const exhaustedTraversal = {
    ...state.traversal,
    remainingWords: [],
    tried: appendUnique(state.traversal.tried, current.id),
    parked: appendUnique(state.traversal.parked, current.id),
    exhausted: appendUnique(state.traversal.exhausted, current.id),
  };

  if (state.pendingDelivery) {
    return {
      ...state,
      childMode: 'source_exhausted',
      traversal: exhaustedTraversal,
      brainLog: currentAlreadyExhausted ? state.brainLog : pushLogs(state,
        ...(current.kind === 'own_active' && state.currentNeed ? [log(`${state.currentNeed.needName} own active memory exhausted; no repeated words allowed in this run.`, 'memory', now)] : [log(`${current.label} exhausted; no unused words remain in the current source.`, 'memory', now)]),
        log('Child waiting: no unused words remain while Mother pending.', 'child', now),
        ...(current.kind === 'own_active' ? [log('Known Need will not jump to Base because own active memory exists.', 'memory', now)] : []),
      ),
    };
  }

  if (current.kind === 'own_active' && state.currentNeed) {
    return {
      ...state,
      childMode: 'source_exhausted',
      traversal: { ...exhaustedTraversal, currentIndex: 0, baseReached: false },
      brainLog: currentAlreadyExhausted ? state.brainLog : pushLogs(state,
        log(`${state.currentNeed.needName} own active memory exhausted; no repeated words allowed in this run.`, 'memory', now),
        log('Known Need will not jump to Base because own active memory exists.', 'memory', now),
      ),
    };
  }

  if (!state.currentNeed) return { ...state, traversal: exhaustedTraversal };
  let tried = exhaustedTraversal.tried;
  let parked = exhaustedTraversal.parked;
  let exhausted = exhaustedTraversal.exhausted;
  let skipped = exhaustedTraversal.skipped;
  const skippedLogs: LogEvent[] = [];
  let nextIndex = state.traversal.currentIndex + 1;
  let nextSource = state.traversal.plan[nextIndex];
  let nextWords: string[] = [];
  while (nextSource) {
    nextWords = unusedWords(nextSource.words, state);
    if (nextWords.length) break;
    tried = appendUnique(tried, nextSource.id);
    parked = appendUnique(parked, nextSource.id);
    exhausted = appendUnique(exhausted, nextSource.id);
    skipped = appendUnique(skipped, nextSource.id);
    skippedLogs.push(log(`Skipping source because all words already spoken this run: ${nextSource.label}.`, 'memory', now));
    nextIndex += 1;
    nextSource = state.traversal.plan[nextIndex];
  }

  if (!nextSource) return {
    ...state,
    childMode: 'source_exhausted',
    traversal: { ...exhaustedTraversal, tried, parked, exhausted, skipped },
    brainLog: currentAlreadyExhausted ? state.brainLog : pushLogs(state,
      log(`${current.label} exhausted; no unused words remain in this run.`, 'memory', now),
      ...skippedLogs,
      log('Child waiting: all available word sources are exhausted for this run.', 'child', now),
    ),
  };

  return {
    ...state,
    currentNeed: {
      ...state.currentNeed,
      currentWordSource: nextSource.kind,
      currentMemoryMode: sourceMode(nextSource.kind),
      sourceNeed: nextSource.sourceNeed,
      fallbackDepth: nextSource.depth,
    },
    traversal: {
      ...state.traversal,
      currentIndex: nextIndex,
      cycleCount: 1,
      remainingWords: nextWords,
      tried,
      parked,
      exhausted,
      skipped,
      baseReached: state.traversal.baseReached || nextSource.kind === 'base',
    },
    brainLog: pushLogs(state,
      log(`Parked exhausted source: ${current.label}.`, 'memory', now),
      ...skippedLogs,
      ...(current.depth !== nextSource.depth ? [log(`Fallback depth changed to ${nextSource.depth ?? 'base'}.`, 'memory', now)] : []),
      ...(nextSource.kind === 'base' ? [log('All known memories exhausted. Base 70-word list reached.', 'memory', now)] : []),
      log(`Word source selected: ${nextSource.label}.`, 'memory', now),
    ),
  };
}

export function tickState(
  state: SimulationState,
  deltaTimeMs: number,
  now = Date.now(),
  random: () => number = Math.random,
): SimulationState {
  if (!state.isRunning) return state;
  let next = state;
  if (next.pendingDelivery) {
    const timerMs = next.pendingDelivery.timerMs - deltaTimeMs;
    if (timerMs <= 0) return completeDelivery(next, now);
    next = { ...next, pendingDelivery: { ...next.pendingDelivery, timerMs } };
  }
  if (!next.currentNeed || next.currentNeed.status !== 'active') return next;

  const increase = (next.currentNeed.dissatisfactionRisePerMinute / 60_000) * deltaTimeMs * next.dissatisfactionSpeed;
  const dissatisfaction = Math.min(next.currentNeed.maxDissatisfaction, next.currentNeed.dissatisfaction + increase);
  const wasZero = next.currentNeed.dissatisfaction === 0 && dissatisfaction > 0;
  const crossedThreshold = next.currentNeed.dissatisfaction <= next.currentNeed.actionThreshold && dissatisfaction > next.currentNeed.actionThreshold;
  next = {
    ...next,
    currentNeed: { ...next.currentNeed, dissatisfaction },
    childMode: 'rising',
    brainLog: wasZero
      ? pushLogs(next, log(`Dissatisfaction rising at ${next.currentNeed.dissatisfactionRisePerMinute} point/min (${next.dissatisfactionSpeed}× need speed).`, 'need', now))
      : next.brainLog,
  };
  if (crossedThreshold) {
    next = { ...next, brainLog: pushLogs(next, log(`Action threshold crossed at ${dissatisfaction.toFixed(2)}. Child begins speaking.`, 'need', now)) };
  }
  if (dissatisfaction <= next.currentNeed.actionThreshold) return next;

  if (!next.traversal.remainingWords.length) return advanceTraversal(next, now);
  const remainingTimer = next.nextWordInMs - deltaTimeMs;
  if (remainingTimer > 0) return { ...next, nextWordInMs: remainingTimer, childMode: 'speaking' };
  const word = next.traversal.remainingWords[0];
  if (!word) return advanceTraversal(next, now);
  next = {
    ...next,
    traversal: { ...next.traversal, remainingWords: next.traversal.remainingWords.slice(1) },
    nextWordInMs: random() * 3_000,
    brainLog: pushLogs(next, log(`Word selected from ${next.traversal.plan[next.traversal.currentIndex]?.label ?? 'current source'}: ${next.traversal.remainingWords.length - 1} unused words remaining.`, 'memory', now)),
  };
  next = childSpoke(next, word, now, random);
  if (next.traversal.remainingWords.length === 0) next = advanceTraversal(next, now);
  return next;
}

export function clearBrain(state: SimulationState, now = Date.now()): SimulationState {
  return {
    ...state,
    isRunning: false,
    currentNeed: null,
    childMode: 'waiting',
    speechStream: [],
    needMemories: {},
    pendingDelivery: null,
    motherStatus: { phase: 'listening', message: 'Listening for the Child', item: null },
    traversal: emptyTraversal(),
    nextWordInMs: 0,
    brainLog: pushLogs(state, log('Clear Brain completed. Learned memories and current round removed; Mother rules retained.', 'system', now)),
    lastRunReport: null,
  };
}

export function factoryReset(_state: SimulationState, now = Date.now()): SimulationState {
  const reset = createInitialState(now);
  return { ...reset, brainLog: [log('Factory reset completed. Default Mother rules restored.', 'system', now)] };
}

export function addRule(state: SimulationState, input: Partial<MotherRule>, now = Date.now()): SimulationState {
  const needName = (input.needName || state.currentNeed?.needName || 'new need').trim().toLowerCase();
  const rule: MotherRule = {
    id: uuid(), needName, triggerWord: (input.triggerWord || needName).trim().toLowerCase(), itemGiven: (input.itemGiven || needName).trim(),
    minDelaySeconds: input.minDelaySeconds ?? 9, maxDelaySeconds: input.maxDelaySeconds ?? 12, enabled: input.enabled ?? true,
  };
  return { ...state, motherRules: [...state.motherRules, rule], brainLog: pushLogs(state, log(`Mother rule added for ${needName}.`, 'mother', now)) };
}

export function updateRule(state: SimulationState, id: string, changes: Partial<MotherRule>, now = Date.now()): SimulationState {
  return { ...state, motherRules: state.motherRules.map((rule) => rule.id === id ? { ...rule, ...changes } : rule), brainLog: pushLogs(state, log('Mother rule updated.', 'mother', now)) };
}

export function removeRule(state: SimulationState, id: string, now = Date.now()): SimulationState {
  return { ...state, motherRules: state.motherRules.filter((rule) => rule.id !== id), brainLog: pushLogs(state, log('Mother rule removed.', 'mother', now)) };
}

export function getMatchingRules(state: SimulationState): MotherRule[] {
  if (!state.currentNeed) return [];
  const key = keyFor(state.currentNeed.needName);
  return state.motherRules.filter((rule) => rule.enabled && keyFor(rule.needName) === key);
}

export function hasMatchingRule(state: SimulationState): boolean {
  return state.currentNeed ? getMatchingRules(state).length > 0 : true;
}
