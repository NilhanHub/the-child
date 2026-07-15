import { useState } from 'react';
import { FlaskConical, Play, SearchCheck } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { buildDryRunPlan, type DryRunResult } from '../simulation/explainability';

export function DryRunPanel() {
  const { state } = useSimulation();
  const [needName, setNeedName] = useState(state.currentNeed?.needName ?? 'juice');
  const [triggerWord, setTriggerWord] = useState('');
  const [useCurrentMemories, setUseCurrentMemories] = useState(true);
  const [includeBase, setIncludeBase] = useState(true);
  const [showWords, setShowWords] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);

  const run = () => setResult(buildDryRunPlan(state, { needName, triggerWord: triggerWord || undefined, useCurrentMemories, includeBase, showWords }));

  return <section className="panel p-4">
    <div className="panel-heading"><span><FlaskConical className="!text-violet-300" />Dry Run: Memory Search Plan</span><span className="status-dot">read-only diagnostic</span></div>
    <p className="mb-4 text-xs leading-5 text-slate-500">Preview the engine’s actual source order. This does not create a Need, speak words, edit memory, or schedule Mother.</p>
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
      <label className="field-label">Need name<input className="field mt-1" value={needName} onChange={(event) => setNeedName(event.target.value)} placeholder="e.g. up" /></label>
      <label className="field-label">Trigger word (optional)<input className="field mt-1" value={triggerWord} onChange={(event) => setTriggerWord(event.target.value)} placeholder="uses matching rule when blank" /></label>
      <button type="button" className="control control-primary self-end" onClick={run}><Play className="h-4 w-4" />Run dry search</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
      <Check label="Use current memories" checked={useCurrentMemories} onChange={setUseCurrentMemories} />
      <Check label="Include Base" checked={includeBase} onChange={setIncludeBase} />
      <Check label="Show word-level plan" checked={showWords} onChange={setShowWords} />
    </div>
    {result && <div className="mt-4 border-t border-white/10 pt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Known Need" value={result.knownNeed ? 'yes' : 'no'} /><Metric label="Own active memory" value={result.hasOwnActiveMemory ? 'yes' : 'no'} /><Metric label="Mother rule" value={result.motherRuleFound ? 'found' : 'not found'} /><Metric label="Expected trigger" value={result.triggerWord ?? 'none'} /></div>
      {result.baseBlocked && <div className="mt-3 rounded-lg border border-indigo-300/20 bg-indigo-400/[.07] p-3 text-xs text-indigo-100">Known-Need rule: Base and archived history are blocked. Only own active memory would run.</div>}
      <ol className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1" aria-label="Dry run source order">
        {result.sources.map((source, index) => <li key={source.id} className={`rounded-xl border p-3 ${source.triggerPresent ? 'border-emerald-400/30 bg-emerald-400/[.08]' : source.skipped ? 'border-amber-400/20 bg-amber-400/[.06]' : 'border-white/8 bg-black/20'}`}>
          <div className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 font-mono text-[9px] text-slate-400">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-100">{source.label}</strong><span className="status-dot">{source.kind.replaceAll('_', ' ')} · {source.depth === null ? 'final' : `depth ${source.depth}`}</span></div><p className="mt-1 text-[10px] text-slate-500">{source.originalWordCount} stored unique · {source.availableWordCount} globally unused · {source.skipped ? 'skipped' : source.wouldBeReached ? 'would run' : 'after trigger / not reached'}</p>{source.triggerPresent && <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-300"><SearchCheck className="h-3.5 w-3.5" />Trigger word appears in this source.</p>}{source.skipReason && <p className="mt-2 text-[10px] text-amber-200">{source.skipReason}</p>}{showWords && source.availableWords.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{source.availableWords.map((word) => <span key={word} className="word-token">{word}</span>)}</div>}</div></div>
        </li>)}
      </ol>
      <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${result.triggerFound && result.triggerActionable ? 'border-emerald-400/25 bg-emerald-400/[.07] text-emerald-100' : 'border-amber-400/25 bg-amber-400/[.08] text-amber-100'}`}>{result.outcome}</div>
      <p className="mt-2 text-[9px] leading-4 text-slate-600">Source order is exact. Word chips show stored order for diagnosis; the live engine shuffles each source once before speaking.</p>
    </div>}
  </section>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
