import { Activity, Baby } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useSimulation } from '../context/SimulationContext';

export function ChildStatus() {
  const { state } = useSimulation();
  const need = state.currentNeed;
  const percent = need ? Math.min(100, (need.dissatisfaction / need.maxDissatisfaction) * 100) : 0;
  const mode = !need
    ? 'Waiting · no active Need'
    : need.status === 'satisfied' && state.childMode === 'learning_saved'
      ? 'Learning saved'
      : !state.isRunning
        ? 'Need created · paused'
        : state.childMode === 'source_exhausted'
          ? state.pendingDelivery ? 'Waiting after exhausting words' : 'Source exhausted · waiting'
          : state.pendingDelivery
            ? 'Speaking while Mother prepares'
            : state.childMode === 'rising' ? 'Dissatisfaction rising' : 'Speaking';
  return <section className="panel p-4">
    <div className="panel-heading"><span><Baby />The Child</span><span className={state.isRunning ? 'status-live' : 'status-dot'}>{state.isRunning ? 'running' : 'paused'}</span></div>
    {need ? <div className="space-y-4">
      <div className={`rounded-xl border p-3 ${state.childMode === 'source_exhausted' ? 'border-amber-400/30 bg-amber-400/10' : state.pendingDelivery ? 'border-violet-400/30 bg-violet-400/10' : 'border-indigo-400/25 bg-indigo-400/8'}`}>
        <p className="eyebrow">Child Mode</p>
        <p className="mt-1 text-sm font-semibold text-white">{mode}</p>
        <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-2">
          <div className="metric"><span>Child awareness</span><strong>{state.pendingDelivery ? 'Does not know Mother is preparing' : need.status === 'satisfied' ? 'Relief received' : 'Following dissatisfaction'}</strong></div>
          <div className="metric"><span>Mother pending</span><strong>{state.pendingDelivery ? 'yes' : 'no'}</strong></div>
          {need.status === 'satisfied' && <><div className="metric"><span>Outcome</span><strong>satisfied</strong></div><div className="metric"><span>Learning</span><strong>{state.childMode === 'learning_saved' ? 'saved' : 'pending'}</strong></div></>}
        </div>
      </div>
      <div className="flex items-end justify-between"><div><p className="eyebrow">Current Need</p><h2 className="text-2xl font-semibold text-white">{need.needName}</h2></div><span className="font-mono text-sm text-indigo-200">{need.dissatisfaction.toFixed(2)} / {need.maxDissatisfaction}</span></div>
      <div><div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-500"><span className="flex items-center gap-1"><Activity className="h-3 w-3" />Dissatisfaction</span><span>threshold {need.actionThreshold}</span></div><div className="relative h-2 overflow-hidden rounded-full bg-slate-900"><motion.div className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-rose-400" animate={{ width: `${percent}%` }} /><span className="absolute inset-y-0 w-px bg-amber-300" style={{ left: `${(need.actionThreshold / need.maxDissatisfaction) * 100}%` }} /></div></div>
      <div className="grid grid-cols-2 gap-2"><Metric label="Engine mode" value={state.childMode.replaceAll('_', ' ')} /><Metric label="Need state" value={need.status} /><Metric label="Source" value={need.currentWordSource.replaceAll('_', ' ')} /><Metric label="Unique words this run" value={String(need.wordsSpokenThisRound)} /></div>
    </div> : <Empty><strong className="mb-1 block text-slate-300">Child Mode: Waiting</strong>No active Need. Create one in the control panel.</Empty>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ children }: { children: ReactNode }) { return <div className="empty-state">{children}</div>; }
