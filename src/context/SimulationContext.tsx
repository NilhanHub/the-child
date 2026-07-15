import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { SimulationAction, SimulationState } from '../types';
import {
  addRule,
  clearBrain,
  createInitialState,
  createNeed,
  factoryReset,
  removeRule,
  tickState,
  updateRule,
} from '../simulation/engine';
import { decodePersistedState, encodePersistedState, LEGACY_STORAGE_KEY, STORAGE_KEY } from '../simulation/persistence';
import { createSimulationClock } from '../simulation/clock';

function reducer(state: SimulationState, action: SimulationAction): SimulationState {
  const now = Date.now();
  switch (action.type) {
    case 'START':
      if (!state.currentNeed || state.currentNeed.status !== 'active') return state;
      return { ...state, isRunning: true };
    case 'PAUSE':
      return { ...state, isRunning: false, childMode: state.currentNeed ? 'waiting' : state.childMode };
    case 'SET_SPEED':
      return { ...state, dissatisfactionSpeed: action.payload };
    case 'CREATE_NEED':
      return createNeed(state, action.payload, now);
    case 'UPDATE_NEED':
      if (!state.currentNeed) return state;
      return { ...state, currentNeed: { ...state.currentNeed, ...action.payload } };
    case 'TICK':
      return tickState(state, action.payload.deltaTimeMs, action.payload.now, () => action.payload.random);
    case 'ADD_RULE':
      return addRule(state, action.payload ?? {}, now);
    case 'UPDATE_RULE':
      return updateRule(state, action.payload.id, action.payload.changes, now);
    case 'REMOVE_RULE':
      return removeRule(state, action.payload.id, now);
    case 'CLEAR_BRAIN':
      return clearBrain(state, now);
    case 'FACTORY_RESET':
      return factoryReset(state, now);
    case 'LOAD_STATE':
      return { ...action.payload, isRunning: false };
    default:
      return state;
  }
}

function initializeState(): SimulationState {
  const now = Date.now();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const decoded = decodePersistedState(raw, now);
    if (decoded.ok && decoded.state) return decoded.state;
    const fresh = createInitialState(now);
    return {
      ...fresh,
      brainLog: [{ id: crypto.randomUUID(), timestamp: now, message: `Saved v2 state ignored: ${decoded.reason}`, type: 'system' }, ...fresh.brainLog],
    };
  }
  const fresh = createInitialState(now);
  if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
    return {
      ...fresh,
      brainLog: [{ id: crypto.randomUUID(), timestamp: now, message: 'Legacy saved state detected and intentionally ignored. The old key was left untouched.', type: 'system' }, ...fresh.brainLog],
    };
  }
  return fresh;
}

const SimulationContext = createContext<{ state: SimulationState; dispatch: React.Dispatch<SimulationAction> } | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initializeState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, encodePersistedState(state));
  }, [state]);

  useEffect(() => {
    return createSimulationClock({
      now: () => performance.now(),
      schedule: (callback, intervalMs) => window.setInterval(callback, intervalMs),
      cancel: (id) => window.clearInterval(id),
      isRunning: () => stateRef.current.isRunning,
      onTick: (deltaTimeMs) => {
        dispatch({ type: 'TICK', payload: { deltaTimeMs, now: Date.now(), random: Math.random() } });
      },
    });
  }, []);

  return <SimulationContext.Provider value={{ state, dispatch }}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
}
