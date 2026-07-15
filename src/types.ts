export type NeedStatus = 'active' | 'paused' | 'satisfied';
export type ChildMode = 'waiting' | 'rising' | 'speaking' | 'delivery_pending' | 'source_exhausted' | 'satisfied' | 'learning_saved';
export type WordSourceKind = 'own_active' | 'borrowed_active' | 'archived' | 'base';
export type MotherPhase = 'listening' | 'detected' | 'preparing' | 'saying_ok' | 'item_given';

export interface Need {
  id: string;
  needName: string;
  dissatisfaction: number;
  dissatisfactionRisePerMinute: number;
  actionThreshold: number;
  maxDissatisfaction: number;
  status: NeedStatus;
  wordsSpokenThisRound: number;
  currentWordSource: WordSourceKind;
  currentMemoryMode: 'own' | 'borrowed' | 'archived' | 'base';
  sourceNeed: string | null;
  fallbackDepth: number | null;
}

export interface NeedMemory {
  needName: string;
  activeMemoryWords: string[];
  savedLists: string[][];
  successCount: number;
  createdAt: number;
  lastUsedAt: number;
  lastSourceThatWorked: WordSourceKind;
}

export interface MotherRule {
  id: string;
  needName: string;
  triggerWord: string;
  itemGiven: string;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  enabled: boolean;
}

export interface PendingDelivery {
  needId: string;
  triggerWord: string;
  itemGiven: string;
  timerMs: number;
  totalDelayMs: number;
  detectedAt: number;
}

export interface SpeechEvent {
  id: string;
  word: string;
  timestamp: number;
}

export interface LogEvent {
  id: string;
  timestamp: number;
  message: string;
  type: 'system' | 'child' | 'mother' | 'need' | 'memory';
}

export interface FallbackSource {
  id: string;
  kind: WordSourceKind;
  sourceNeed: string | null;
  depth: number | null;
  words: string[];
  label: string;
}

export interface TraversalState {
  plan: FallbackSource[];
  currentIndex: number;
  cycleCount: number;
  remainingWords: string[];
  tried: string[];
  parked: string[];
  exhausted: string[];
  skipped: string[];
  baseReached: boolean;
}

export interface LastRunReport {
  needName: string;
  satisfied: boolean;
  workedFrom: WordSourceKind;
  sourceNeed: string | null;
  triggerWord: string;
  motherDelaySeconds: number;
  triggerHeardAtWord: number | null;
  wordsSpokenTotal: number;
  uniqueWordsSpoken: number;
  savedMemoryCount: number;
  savedWords: string[];
  baseReached: boolean;
  sourceExhaustionHappened: boolean;
  noRepeatCausedWaiting: boolean;
  completedAt: number;
}

export interface MotherStatusState {
  phase: MotherPhase;
  message: string;
  item: string | null;
}

export interface SimulationState {
  schemaVersion: 2;
  isRunning: boolean;
  dissatisfactionSpeed: 1 | 10 | 60;
  currentNeed: Need | null;
  childMode: ChildMode;
  speechStream: SpeechEvent[];
  needMemories: Record<string, NeedMemory>;
  motherRules: MotherRule[];
  pendingDelivery: PendingDelivery | null;
  motherStatus: MotherStatusState;
  traversal: TraversalState;
  nextWordInMs: number;
  brainLog: LogEvent[];
  lastRunReport: LastRunReport | null;
}

export type SimulationAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'SET_SPEED'; payload: 1 | 10 | 60 }
  | { type: 'CREATE_NEED'; payload: Partial<Need> }
  | { type: 'UPDATE_NEED'; payload: Partial<Need> }
  | { type: 'TICK'; payload: { deltaTimeMs: number; now: number; random: number } }
  | { type: 'ADD_RULE'; payload?: Partial<MotherRule> }
  | { type: 'UPDATE_RULE'; payload: { id: string; changes: Partial<MotherRule> } }
  | { type: 'REMOVE_RULE'; payload: { id: string } }
  | { type: 'CLEAR_BRAIN' }
  | { type: 'FACTORY_RESET' }
  | { type: 'LOAD_STATE'; payload: SimulationState };
