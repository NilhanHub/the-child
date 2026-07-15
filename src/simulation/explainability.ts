import type { LogEvent, MotherRule, SimulationState, WordSourceKind } from '../types';
import { buildFallbackPlan } from './engine';

const normalize = (value: string) => value.trim().toLowerCase();
const uniqueWords = (words: readonly string[]) => [...new Set(words.map(normalize).filter(Boolean))];

export interface DryRunOptions {
  needName: string;
  triggerWord?: string;
  useCurrentMemories: boolean;
  includeBase: boolean;
  showWords: boolean;
}

export interface DryRunSource {
  id: string;
  label: string;
  kind: WordSourceKind;
  sourceNeed: string | null;
  depth: number | null;
  originalWordCount: number;
  availableWordCount: number;
  availableWords: string[];
  skipped: boolean;
  skipReason: string | null;
  triggerPresent: boolean;
  wouldBeReached: boolean;
}

export interface DryRunResult {
  needName: string;
  knownNeed: boolean;
  hasOwnActiveMemory: boolean;
  motherRuleFound: boolean;
  triggerWord: string | null;
  sources: DryRunSource[];
  baseBlocked: boolean;
  baseWouldBeReached: boolean;
  triggerFound: boolean;
  triggerActionable: boolean;
  triggerSourceId: string | null;
  outcome: string;
}

export function filterMotherRules(rules: MotherRule[], query: string): MotherRule[] {
  const needle = normalize(query);
  if (!needle) return rules;
  return rules.filter((rule) => [
    rule.needName,
    rule.triggerWord,
    rule.itemGiven,
    rule.enabled ? 'enabled' : 'disabled',
  ].some((value) => normalize(value).includes(needle)));
}

export function buildDryRunPlan(state: SimulationState, options: DryRunOptions): DryRunResult {
  const needName = normalize(options.needName) || 'unnamed need';
  const memories = options.useCurrentMemories ? state.needMemories : {};
  const own = memories[needName];
  const hasOwnActiveMemory = Boolean(own?.activeMemoryWords.length);
  const matchingRule = state.motherRules.find((rule) => rule.enabled && normalize(rule.needName) === needName);
  const triggerWord = normalize(options.triggerWord ?? matchingRule?.triggerWord ?? '') || null;
  const built = buildFallbackPlan(needName, memories, (words) => [...words]);
  const actualPlan = hasOwnActiveMemory
    ? built.filter((source) => source.kind === 'own_active')
    : built.filter((source) => options.includeBase || source.kind !== 'base');
  const spoken = new Set<string>();
  let triggerSourceId: string | null = null;

  const sources = actualPlan.map<DryRunSource>((source) => {
    const original = uniqueWords(source.words);
    const available = original.filter((word) => !spoken.has(word));
    const skipped = available.length === 0;
    if (!skipped) available.forEach((word) => spoken.add(word));
    const triggerPresent = Boolean(triggerWord && available.includes(triggerWord));
    if (!triggerSourceId && triggerPresent) triggerSourceId = source.id;
    return {
      id: source.id,
      label: source.label,
      kind: source.kind,
      sourceNeed: source.sourceNeed,
      depth: source.depth,
      originalWordCount: original.length,
      availableWordCount: available.length,
      availableWords: options.showWords ? available : [],
      skipped,
      skipReason: skipped ? 'All words were already spoken earlier in this run.' : null,
      triggerPresent,
      wouldBeReached: true,
    };
  });

  const triggerIndex = sources.findIndex((source) => source.id === triggerSourceId);
  sources.forEach((source, index) => {
    source.wouldBeReached = triggerIndex < 0 || index <= triggerIndex;
  });
  const baseIndex = sources.findIndex((source) => source.kind === 'base');
  const triggerFound = triggerSourceId !== null;
  const triggerActionable = Boolean(matchingRule && triggerWord === normalize(matchingRule.triggerWord));
  const baseWouldBeReached = baseIndex >= 0 && (triggerIndex < 0 || baseIndex <= triggerIndex);
  const baseBlocked = hasOwnActiveMemory;
  const outcome = triggerFound && triggerActionable
    ? `Trigger word appears in ${sources[triggerIndex].label}. Mother would schedule delivery there.`
    : triggerFound && matchingRule
      ? `Diagnostic trigger appears in ${sources[triggerIndex].label}, but Mother expects “${matchingRule.triggerWord}”. Mother would not schedule delivery for “${triggerWord}”.`
      : triggerFound
        ? `Trigger word appears in ${sources[triggerIndex].label}, but no enabled Mother rule matches this Need. Mother would not schedule delivery.`
    : 'Trigger word not found in any available source. The Child will exhaust all sources and wait / remain unsatisfied unless a matching rule or word source is added.';

  return {
    needName,
    knownNeed: Boolean(own),
    hasOwnActiveMemory,
    motherRuleFound: Boolean(matchingRule),
    triggerWord,
    sources,
    baseBlocked,
    baseWouldBeReached,
    triggerFound,
    triggerActionable,
    triggerSourceId,
    outcome,
  };
}

export type TraversalTimelineStatus = 'queued' | 'current' | 'tried' | 'parked' | 'exhausted' | 'skipped' | 'success' | 'blocked';

export function buildTraversalTimeline(state: SimulationState) {
  return state.traversal.plan.map((source, index) => {
    const isCurrent = index === state.traversal.currentIndex;
    const skippedBecauseAlreadySpoken = state.traversal.skipped.includes(source.id);
    let status: TraversalTimelineStatus = 'queued';
    if (!isCurrent && source.kind === 'base' && state.traversal.plan[0]?.kind === 'own_active') status = 'blocked';
    else if (isCurrent && state.currentNeed?.status === 'satisfied') status = 'success';
    else if (isCurrent) status = 'current';
    else if (skippedBecauseAlreadySpoken) status = 'skipped';
    else if (state.traversal.exhausted.includes(source.id)) status = 'exhausted';
    else if (state.traversal.parked.includes(source.id)) status = 'parked';
    else if (state.traversal.tried.includes(source.id)) status = 'tried';
    return {
      ...source,
      index,
      isCurrent,
      status,
      exhausted: state.traversal.exhausted.includes(source.id),
      parked: state.traversal.parked.includes(source.id),
      skippedBecauseAlreadySpoken,
      unusedWordCount: isCurrent ? state.traversal.remainingWords.length : uniqueWords(source.words).length,
    };
  });
}

export type LogFilter = 'all' | 'child' | 'mother' | 'memory' | 'traversal' | 'rule_need' | 'warnings';

export function filterLogEvents(events: LogEvent[], filter: LogFilter): LogEvent[] {
  if (filter === 'all') return events;
  return events.filter((event) => {
    const message = normalize(event.message);
    if (filter === 'child') return event.type === 'child';
    if (filter === 'mother') return event.type === 'mother';
    if (filter === 'memory') return event.type === 'memory';
    if (filter === 'rule_need') return event.type === 'need' || message.includes('rule');
    if (filter === 'warnings') return /(no enabled|ignored|cannot|exhaust|skipping|warning)/.test(message);
    return event.type === 'memory'
      && !message.startsWith('word selected from')
      && /(word source selected|fallback|base|park|skip|exhaust|depth|known need)/.test(message);
  });
}
