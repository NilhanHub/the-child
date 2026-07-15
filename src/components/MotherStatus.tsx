import { CheckCircle2, Ear, Heart, Loader2, PackageCheck } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export function MotherStatus() {
  const { state } = useSimulation();
  const pending = state.pendingDelivery;
  const Icon = pending ? Loader2 : state.motherStatus.phase === 'item_given' ? PackageCheck : Ear;
  return <section className="panel p-4">
    <div className="panel-heading"><span><Heart className="!text-rose-400" />The Mother</span><span className="status-dot">automatic</span></div>
    <div className={`rounded-xl border p-4 ${pending ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-black/15'}`}>
      <div className="flex items-start gap-3"><Icon className={`mt-0.5 h-5 w-5 ${pending ? 'animate-spin text-amber-300' : 'text-rose-300'}`} /><div><p className="eyebrow">{state.motherStatus.phase.replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-slate-200">{state.motherStatus.message}</p></div></div>
      {pending && <div className="mt-4"><div className="mb-1 flex justify-between font-mono text-[10px] text-amber-200"><span>pending {pending.itemGiven}</span><span>{(pending.timerMs / 1_000).toFixed(1)}s</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full bg-amber-300 transition-[width]" style={{ width: `${Math.max(0, pending.timerMs / pending.totalDelayMs) * 100}%` }} /></div></div>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div className="metric"><span>Detection</span><strong>{pending ? 'correct word' : 'listening'}</strong></div><div className="metric"><span>Delivery</span><strong className="flex items-center gap-1">{state.motherStatus.phase === 'item_given' && <CheckCircle2 className="h-3 w-3" />}{pending ? 'preparing' : state.motherStatus.phase.replaceAll('_', ' ')}</strong></div></div>
  </section>;
}
