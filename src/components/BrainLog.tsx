import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Terminal } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { filterLogEvents, type LogFilter } from '../simulation/explainability';

const color = { system: 'text-slate-400', child: 'text-indigo-300', mother: 'text-rose-300', need: 'text-emerald-300', memory: 'text-cyan-300' };
const filters: { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'child', label: 'Child speech' }, { id: 'mother', label: 'Mother' },
  { id: 'memory', label: 'Memory' }, { id: 'traversal', label: 'Traversal' }, { id: 'rule_need', label: 'Rule / Need' }, { id: 'warnings', label: 'Warnings' },
];

export function BrainLog() {
  const { state } = useSimulation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAwayFromLatest, setIsAwayFromLatest] = useState(false);
  const [filter, setFilter] = useState<LogFilter>('all');
  const visibleEvents = filterLogEvents(state.brainLog, filter);

  const jumpToLatest = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIsAwayFromLatest(false);
  };

  useEffect(() => {
    if (!isAwayFromLatest && scrollRef.current && scrollRef.current.scrollTop !== 0) scrollRef.current.scrollTop = 0;
  }, [state.brainLog[0]?.id, isAwayFromLatest, filter]);

  return <section className="panel flex min-h-80 flex-1 flex-col p-4">
    <div className="panel-heading"><span><Terminal className="!text-pink-400" />Brain / Event Log</span><span className="flex items-center gap-2"><span className="status-dot">Newest first</span><span className="status-dot">{visibleEvents.length}/{state.brainLog.length}</span></span></div>
    <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Event log filters">{filters.map((candidate) => <button key={candidate.id} className={`chip ${filter === candidate.id ? '!border-pink-300/30 !bg-pink-400/10 !text-pink-200' : ''}`} onClick={() => setFilter(candidate.id)} aria-pressed={filter === candidate.id}>{candidate.label}</button>)}</div>
    {isAwayFromLatest && <button className="control mb-2 self-end !min-h-7 !px-2 !py-1" onClick={jumpToLatest}><ArrowUp className="h-3 w-3" />Jump to latest</button>}
    <div ref={scrollRef} data-testid="brain-log-scroll" onScroll={(event) => { const away = event.currentTarget.scrollTop > 24; setIsAwayFromLatest((current) => current === away ? current : away); }} className="max-h-[34rem] flex-1 space-y-2 overflow-y-auto font-mono text-[10px]" aria-live="polite">
      {visibleEvents.map((event) => <div className="flex items-start gap-2" key={event.id}><span className="shrink-0 text-slate-600">{new Date(event.timestamp).toLocaleTimeString()}</span><span className={color[event.type]}>{event.message}</span></div>)}
      {!visibleEvents.length && <div className="empty-state !p-4">No events match this filter yet.</div>}
    </div>
  </section>;
}
