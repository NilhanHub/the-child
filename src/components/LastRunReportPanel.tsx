import { ClipboardCheck, Clock3 } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export function LastRunReportPanel() {
  const { state } = useSimulation();
  const report = state.lastRunReport;
  return <section className="panel p-4">
    <div className="panel-heading"><span><ClipboardCheck className="!text-emerald-300" />Last Run Report</span><span className="status-dot">previous outcome</span></div>
    {report ? <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-3">
        <div><p className="eyebrow">Need</p><h3 className="mt-1 text-lg font-semibold text-white">{report.needName}</h3><p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-300">Satisfied · worked from {report.workedFrom.replaceAll('_', ' ')}</p></div>
        <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500"><Clock3 className="h-3 w-3" />{new Date(report.completedAt).toLocaleTimeString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2"><Metric label="Source Need" value={report.sourceNeed ?? 'Base / none'} /><Metric label="Trigger word" value={report.triggerWord} /><Metric label="Trigger heard" value={report.triggerHeardAtWord ? `word ${report.triggerHeardAtWord}` : 'unknown'} /><Metric label="Mother delay" value={`${report.motherDelaySeconds.toFixed(1)} sec`} /><Metric label="Words spoken" value={String(report.wordsSpokenTotal)} /><Metric label="Unique spoken" value={String(report.uniqueWordsSpoken)} /><Metric label="Saved memory" value={`${report.savedMemoryCount} words`} /><Metric label="Base reached" value={report.baseReached ? 'yes' : 'no'} /><Metric label="Source exhausted" value={report.sourceExhaustionHappened ? 'yes' : 'no'} /><Metric label="No-repeat wait" value={report.noRepeatCausedWaiting ? 'yes' : 'no'} /></div>
      <details className="disclosure"><summary>View {report.savedWords.length} saved words</summary><div className="mt-3 flex flex-wrap gap-1">{report.savedWords.map((word, index) => <span className="word-token" key={`${word}-${index}`}>{word}</span>)}</div></details>
    </div> : <div className="empty-state">No completed delivery yet. The next successful Need will leave a full report here.</div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
