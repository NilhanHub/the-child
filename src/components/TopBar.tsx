import { BrainCircuit, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export function TopBar() {
  const { state, dispatch } = useSimulation();
  const canRun = Boolean(state.currentNeed && state.currentNeed.status === 'active');

  const clearBrain = () => {
    if (window.confirm('Clear all learned memories and the current round? Mother rules will remain.')) dispatch({ type: 'CLEAR_BRAIN' });
  };
  const factoryReset = () => {
    if (window.confirm('Factory reset the simulator? This clears memories, logs, and rule edits.')) dispatch({ type: 'FACTORY_RESET' });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050916]/90 px-4 py-3 shadow-2xl backdrop-blur-xl lg:px-6">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-400/40 bg-indigo-500/15 shadow-[0_0_24px_rgba(99,102,241,.18)]">
            <BrainCircuit className="h-5 w-5 text-indigo-300" />
          </div>
          <div><h1 className="text-sm font-bold uppercase tracking-[.16em] text-indigo-200 sm:text-lg">Need Learning Lab</h1><p className="text-[9px] uppercase tracking-[.22em] text-slate-500">Rules-of-Life Brain · v2</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Need speed
            <select aria-label="Dissatisfaction speed" value={state.dissatisfactionSpeed} onChange={(event) => dispatch({ type: 'SET_SPEED', payload: Number(event.target.value) as 1 | 10 | 60 })} className="field !w-auto !py-1">
              <option value="1">1×</option><option value="10">10×</option><option value="60">60×</option>
            </select>
          </label>
          <button disabled={!canRun} onClick={() => dispatch({ type: state.isRunning ? 'PAUSE' : 'START' })} className="control control-primary disabled:cursor-not-allowed disabled:opacity-40">
            {state.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{state.isRunning ? 'Pause' : 'Start'}
          </button>
          <button onClick={clearBrain} className="control"><Trash2 className="h-4 w-4" />Clear Brain</button>
          <button onClick={factoryReset} className="control control-danger"><RotateCcw className="h-4 w-4" />Factory Reset</button>
        </div>
      </div>
    </header>
  );
}
