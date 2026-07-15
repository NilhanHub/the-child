import { Archive, Brain, ChevronDown, Clock3 } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import type { NeedMemory } from '../types';

export function MemoryPanels() {
  const { state } = useSimulation();
  const memories = (Object.values(state.needMemories) as NeedMemory[]).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  const currentKey = state.currentNeed?.needName.toLowerCase();
  const current = currentKey ? state.needMemories[currentKey] : undefined;
  return <>
    <section className="panel p-4">
      <div className="panel-heading"><span><Brain className="!text-emerald-400" />Need Memories</span><span className="status-dot">{memories.length} known</span></div>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {memories.map((memory) => <details key={memory.needName.toLowerCase()} className={`disclosure group ${memory === current ? '!border-emerald-400/30 !bg-emerald-400/[.08]' : ''}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2"><div className="min-w-0"><strong className="text-sm text-slate-100">{memory.needName}</strong><span className="mt-1 block font-mono text-[9px] text-slate-500">{memory.successCount} wins · active memory {memory.activeMemoryWords.length} words · {memory.savedLists.length} saved lists</span></div><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" /></summary>
          <div className="mt-3 border-t border-white/8 pt-3"><p className="eyebrow mb-2">Active words</p><div className="flex flex-wrap gap-1">{memory.activeMemoryWords.map((word, index) => <span key={`${word}-${index}`} className="word-token">{word}</span>)}</div><div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500"><span>worked from {memory.lastSourceThatWorked.replaceAll('_', ' ')}</span><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(memory.lastUsedAt).toLocaleTimeString()}</span></div></div>
        </details>)}
        {!memories.length && <div className="empty-state">No learned memories yet. A successful Mother delivery creates the first list.</div>}
      </div>
    </section>
    <section className="panel p-4">
      <div className="panel-heading"><span><Archive />Current Need History</span><span className="status-dot">{current?.savedLists.length ?? 0} lists</span></div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {current?.savedLists.map((list, index) => <details key={index} className="disclosure"><summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-300">Saved list {index + 1} · {list.length} words</summary><div className="mt-3 flex flex-wrap gap-1">{list.map((word, wordIndex) => <span className="word-token" key={`${word}-${wordIndex}`}>{word}</span>)}</div></details>)}
        {!current?.savedLists.length && <div className="empty-state">The current Need has no saved history.</div>}
      </div>
    </section>
  </>;
}
