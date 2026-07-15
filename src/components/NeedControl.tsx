import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PlusCircle, Settings2, WandSparkles } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { getMatchingRules } from '../simulation/engine';

export function NeedControl() {
  const { state, dispatch } = useSimulation();
  const [name, setName] = useState('milk');
  const [rate, setRate] = useState(1);
  const [threshold, setThreshold] = useState(5);
  const need = state.currentNeed;
  const matchingRules = getMatchingRules(state);
  const matchingRule = matchingRules[0];

  const create = (needName = name) => {
    const clean = needName.trim().toLowerCase();
    if (!clean) return;
    dispatch({ type: 'CREATE_NEED', payload: { needName: clean, dissatisfactionRisePerMinute: rate, actionThreshold: threshold } });
    setName(clean);
  };

  return (
    <section className="panel p-4">
      <div className="panel-heading"><span><Settings2 />Need Control</span><span className="status-dot">one at a time</span></div>
      <form onSubmit={(event) => { event.preventDefault(); create(); }} className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]">
        <label className="field-label">Need name<input aria-label="Need name" className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. juice" /></label>
        <label className="field-label">Rise / minute<input aria-label="Dissatisfaction rise per minute" className="field mt-1" type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
        <label className="field-label">Threshold<input aria-label="Action threshold" className="field mt-1" type="number" min="0" step="0.1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
        <button className="control control-primary self-end" type="submit"><PlusCircle className="h-4 w-4" />Begin Need</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick needs">
        {['milk', 'water', 'food', 'toy', 'sleep', 'juice'].map((quick) => <button key={quick} className="chip" onClick={() => create(quick)}>{quick}</button>)}
      </div>
      {need && <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-3">
        <Metric label="Current Need" value={need.needName} /><Metric label="Rule rate" value={`${need.dissatisfactionRisePerMinute} point/min`} /><Metric label="Threshold" value={String(need.actionThreshold)} />
      </div>}
      {need && matchingRule && <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">
        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Matching Mother Rule Found</div>
        <p className="mt-2 font-mono text-[10px] text-emerald-200">Need {matchingRule.needName} → trigger “{matchingRule.triggerWord}” → give {matchingRule.itemGiven} → delay {Math.min(matchingRule.minDelaySeconds, matchingRule.maxDelaySeconds)}–{Math.max(matchingRule.minDelaySeconds, matchingRule.maxDelaySeconds)} sec</p>
        {matchingRules.length > 1 && <p className="mt-2 text-[10px] text-emerald-300">Using the first of {matchingRules.length} enabled matching rules.</p>}
      </div>}
      {need && !matchingRule && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
        <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>No Mother rule can satisfy “{need.needName}”.</strong><br /><span className="mt-1 block text-[10px] leading-4 text-amber-200">The Child may remain unsatisfied after exhausting every available word. Expected fix: create rule {need.needName} → trigger {need.needName} → give {need.needName}.</span></span></span>
        <button className="control !border-amber-300/30 !text-amber-200" onClick={() => dispatch({ type: 'ADD_RULE', payload: { needName: need.needName, triggerWord: need.needName, itemGiven: need.needName } })}><WandSparkles className="h-4 w-4" />Create matching rule</button>
      </div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
