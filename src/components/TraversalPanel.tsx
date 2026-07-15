import { Ban, CheckCircle2, CircleDotDashed, GitBranch, LockKeyhole, Route, SkipForward } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { buildTraversalTimeline } from '../simulation/explainability';

export function TraversalPanel() {
  const { state } = useSimulation();
  const timeline = buildTraversalTimeline(state);
  const current = timeline[state.traversal.currentIndex];
  const ownMemoryOnly = state.traversal.plan[0]?.kind === 'own_active';

  return <section className="panel p-4">
    <div className="panel-heading"><span><Route className="!text-cyan-300" />Memory Traversal Timeline</span><span className="status-dot">{ownMemoryOnly ? 'own-memory only' : 'depth-major fallback'}</span></div>
    {timeline.length ? <>
      <div className={`mb-3 rounded-xl border p-4 ${current?.exhausted ? 'border-amber-300/30 bg-amber-400/[.08]' : 'border-cyan-300/35 bg-cyan-400/[.08] shadow-[0_0_24px_rgba(34,211,238,.08)]'}`} aria-label="Current source pinned summary">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Current source · always visible</p><h3 className="mt-1 text-base font-semibold text-white">{current?.label}</h3><p className="mt-1 text-[10px] uppercase tracking-wider text-cyan-200">{current?.kind.replaceAll('_', ' ')} · {current?.sourceNeed ?? 'no source Need'} · {current?.depth === null ? 'final fallback' : `depth ${current?.depth}`} · pass {state.traversal.cycleCount}</p></div><span className={current?.exhausted ? 'status-dot !border-amber-300/25 !text-amber-200' : 'status-live'}>{current?.exhausted ? 'current · exhausted · waiting' : state.currentNeed?.status === 'satisfied' ? 'success' : 'current'}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Stored unique" value={String(current?.words.length ?? 0)} /><Metric label="Unused now" value={String(state.traversal.remainingWords.length)} /><Metric label="Word in run" value={String(state.speechStream.length)} /><Metric label="No-repeat" value="active" /></div>
      </div>
      <ol className="relative max-h-[34rem] space-y-2 overflow-y-auto pr-1" aria-label="Complete memory search plan">
        {timeline.map((source, index) => <li key={source.id} className={`relative ml-3 border-l pl-5 ${source.isCurrent ? 'border-cyan-300/50' : 'border-white/10'}`}>
          <span className={`absolute -left-[7px] top-4 grid h-3.5 w-3.5 place-items-center rounded-full border ${source.isCurrent ? 'border-cyan-200 bg-cyan-400' : source.status === 'success' ? 'border-emerald-200 bg-emerald-400' : 'border-slate-700 bg-[#080d19]'}`} />
          <article className={`rounded-xl border p-3 ${source.isCurrent ? 'border-cyan-300/30 bg-cyan-400/[.07]' : source.status === 'blocked' ? 'border-indigo-400/15 bg-indigo-400/[.04] opacity-75' : source.status === 'skipped' ? 'border-amber-400/20 bg-amber-400/[.05]' : source.exhausted ? 'border-slate-700/70 bg-slate-900/30' : 'border-white/8 bg-black/15'}`}>
            <div className="flex items-start gap-3"><SourceIcon status={source.status} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-100">{index + 1}. {source.label}</strong><span className="status-dot">{source.status}{source.isCurrent && source.exhausted ? ' · exhausted' : ''}</span></div><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{source.kind.replaceAll('_', ' ')} · Need {source.sourceNeed ?? 'none'} · {source.depth === null ? 'final' : `depth ${source.depth}`} · pass {state.traversal.cycleCount}</p><p className="mt-1 text-[10px] text-slate-400">{source.words.length} unique words · {source.isCurrent ? source.unusedWordCount : source.exhausted ? 0 : source.unusedWordCount} unused {source.status === 'blocked' ? '· blocked by known-Need own-memory rule' : ''}</p>{source.skippedBecauseAlreadySpoken && <p className="mt-2 text-[10px] text-amber-200">Skipped because every word was already spoken earlier in this run.</p>}</div></div>
          </article>
        </li>)}
      </ol>
      <div className="mt-3 grid gap-2 sm:grid-cols-4"><Metric label="Plan sources" value={String(timeline.length)} /><Metric label="Current step" value={`${state.traversal.currentIndex + 1} of ${timeline.length}`} /><Metric label="Exhausted" value={String(state.traversal.exhausted.length)} /><Metric label="Base reached" value={state.traversal.baseReached ? 'yes' : 'no'} /></div>
    </> : <div className="empty-state"><LockKeyhole className="mx-auto mb-2 h-5 w-5" />Create a Need to generate its complete search timeline.</div>}
  </section>;
}

function SourceIcon({ status }: { status: ReturnType<typeof buildTraversalTimeline>[number]['status'] }) {
  if (status === 'blocked') return <Ban className="h-4 w-4 shrink-0 text-indigo-300" />;
  if (status === 'skipped') return <SkipForward className="h-4 w-4 shrink-0 text-amber-300" />;
  if (status === 'success' || status === 'exhausted' || status === 'parked') return <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-500" />;
  if (status === 'current') return <CircleDotDashed className="h-4 w-4 shrink-0 animate-pulse text-cyan-300" />;
  return <GitBranch className="h-4 w-4 shrink-0 text-slate-600" />;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
