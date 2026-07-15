import { useState } from 'react';
import { ChevronDown, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { filterMotherRules } from '../simulation/explainability';
import type { MotherRule } from '../types';

export function MotherRulesPanel() {
  const { state, dispatch } = useSimulation();
  const [query, setQuery] = useState('');
  const visibleRules = filterMotherRules(state.motherRules, query);
  const change = (id: string, changes: Partial<MotherRule>) => dispatch({ type: 'UPDATE_RULE', payload: { id, changes } });
  return <section className="panel p-4">
    <div className="panel-heading"><span><ShieldCheck className="!text-rose-300" />Mother Rules</span><button className="chip" onClick={() => dispatch({ type: 'ADD_RULE' })}><Plus className="h-3 w-3" />Add</button></div>
    <label className="relative mb-3 block">
      <span className="sr-only">Search mother rules</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input className="field !pl-9 !pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mother rules…" aria-label="Search mother rules" />
      {query && <button type="button" className="icon-button absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Clear mother rule search"><X className="h-3.5 w-3.5" /></button>}
    </label>
    <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
      {visibleRules.map((rule) => <details key={rule.id} className="disclosure group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
          <div className="min-w-0"><strong className="block truncate text-xs text-slate-100">{rule.needName} → trigger {rule.triggerWord} → give {rule.itemGiven}</strong><span className={`mt-1 block text-[9px] uppercase tracking-wider ${rule.enabled ? 'text-emerald-300' : 'text-slate-500'}`}>delay {Math.min(rule.minDelaySeconds, rule.maxDelaySeconds)}–{Math.max(rule.minDelaySeconds, rule.maxDelaySeconds)} sec · {rule.enabled ? 'enabled' : 'disabled'}</span></div><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 border-t border-white/8 pt-3">
          <div className="mb-2 flex items-center justify-between"><label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><input type="checkbox" checked={rule.enabled} onChange={(event) => change(rule.id, { enabled: event.target.checked })} />Enabled</label><button aria-label={`Remove ${rule.needName} rule`} className="icon-button" onClick={() => dispatch({ type: 'REMOVE_RULE', payload: { id: rule.id } })}><Trash2 className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-2 gap-2"><Field label="Need" value={rule.needName} onChange={(value) => change(rule.id, { needName: value })} /><Field label="Trigger" value={rule.triggerWord} onChange={(value) => change(rule.id, { triggerWord: value })} /><div className="col-span-2"><Field label="Item" value={rule.itemGiven} onChange={(value) => change(rule.id, { itemGiven: value })} /></div><NumberField label="Min sec" value={rule.minDelaySeconds} onChange={(value) => change(rule.id, { minDelaySeconds: value })} /><NumberField label="Max sec" value={rule.maxDelaySeconds} onChange={(value) => change(rule.id, { maxDelaySeconds: value })} /></div>
        </div>
      </details>)}
      {!visibleRules.length && <div className="empty-state">No Mother rules match “{query.trim()}”. Try a Need, trigger, item, or enabled/disabled status.</div>}
    </div>
  </section>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field-label">{label}<input className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="field-label">{label}<input className="field mt-1" type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
