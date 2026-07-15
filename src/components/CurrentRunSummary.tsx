import { CheckCircle2, CirclePause, Lightbulb, RadioTower } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { getMatchingRules } from '../simulation/engine';

const sourceType = (kind?: string) => kind?.replaceAll('_', ' ') ?? 'none';

export function CurrentRunSummary() {
  const { state } = useSimulation();
  const need = state.currentNeed;
  const source = state.traversal.plan[state.traversal.currentIndex];
  const matchingRule = getMatchingRules(state)[0];
  const knownOwnRun = source?.kind === 'own_active';
  const waitingExhausted = state.childMode === 'source_exhausted';

  if (!need) return <section className="panel p-4">
    <div className="panel-heading"><span><RadioTower className="!text-cyan-300" />Current Run Summary</span><span className="status-dot">idle</span></div>
    <div className="empty-state"><CirclePause className="mx-auto mb-2 h-5 w-5" />No run is active. Begin a Need to see its rule, source, and search path here.</div>
  </section>;

  const why = knownOwnRun
    ? 'The Child already has memory for this Need. It will use its own active memory and will not jump to Base.'
    : source?.kind === 'borrowed_active'
      ? 'The Child has no memory for this Need yet. It is borrowing another Need’s active memory to see if something there works.'
      : source?.kind === 'archived'
        ? 'Current active memories did not work. The Child is walking backward through older saved lists.'
        : source?.kind === 'base'
          ? state.needMemories[need.needName.toLowerCase()]
            ? 'Base is listed for diagnostics but blocked: a known Need stays inside its own active memory.'
            : 'All available known memories were exhausted or absent. The Child is now using the original 70-word Base list.'
          : 'The Child is preparing its memory search plan.';

  return <section className="panel border-cyan-300/15 p-4 shadow-[0_18px_70px_rgba(34,211,238,.06)]">
    <div className="panel-heading"><span><RadioTower className="!text-cyan-300" />Current Run Summary</span><span className={state.isRunning ? 'status-live' : 'status-dot'}>{state.isRunning ? 'live' : need.status}</span></div>
    <div className="grid gap-3 xl:grid-cols-[1.1fr_1.9fr]">
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[.07] p-4">
        <p className="eyebrow">Current Run</p>
        <div className="mt-1 flex items-center justify-between gap-3"><h2 className="text-2xl font-semibold text-white">{need.needName}</h2><span className="status-dot !border-cyan-300/20 !text-cyan-200">{knownOwnRun ? 'known · own-memory only' : 'new · fallback traversal'}</span></div>
        <p className="mt-3 text-xs leading-5 text-slate-300"><strong className="text-white">{source?.label ?? 'No source selected'}</strong><br />{sourceType(source?.kind)} · {source?.depth === null ? 'final fallback' : `depth ${source?.depth ?? 0}`} · pass {state.traversal.cycleCount}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <Metric label="Run state" value={state.isRunning ? 'running' : need.status === 'satisfied' ? 'completed' : 'paused'} />
        <Metric label="Child mode" value={state.childMode.replaceAll('_', ' ')} />
        <Metric label="Mother status" value={state.motherStatus.phase.replaceAll('_', ' ')} />
        <Metric label="Mother rule" value={matchingRule ? 'found' : 'not found'} tone={matchingRule ? 'good' : 'warn'} />
        <Metric label="Trigger expected" value={matchingRule?.triggerWord ?? 'none'} />
        <Metric label="Item to give" value={matchingRule?.itemGiven ?? 'none'} />
        <Metric label="Unique spoken" value={String(state.speechStream.length)} />
        <Metric label="Unused in source" value={String(state.traversal.remainingWords.length)} />
        <Metric label="No-repeat" value="active" tone="good" />
        <Metric label="Mother pending" value={state.pendingDelivery ? 'yes' : 'no'} />
        <Metric label="Waiting exhausted" value={waitingExhausted ? 'yes' : 'no'} tone={waitingExhausted ? 'warn' : undefined} />
        <Metric label="Base reached" value={state.traversal.baseReached ? 'yes' : 'no'} />
      </div>
    </div>
    <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${waitingExhausted ? 'border-amber-300/25 bg-amber-400/[.08] text-amber-100' : 'border-indigo-300/15 bg-indigo-400/[.06] text-slate-300'}`}>
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div><strong className="text-white">Why is the Child doing this?</strong><p className="mt-1">{why}{waitingExhausted && ' No unused words remain in this source because repeats are not allowed in the same run.'}</p></div>
    </div>
  </section>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return <div className={`metric ${tone === 'good' ? '!border-emerald-400/15' : tone === 'warn' ? '!border-amber-400/20' : ''}`}><span>{label}</span><strong className={tone === 'good' ? '!text-emerald-300' : tone === 'warn' ? '!text-amber-200' : ''}>{tone === 'good' && <CheckCircle2 className="mr-1 inline h-3 w-3" />}{value}</strong></div>;
}
