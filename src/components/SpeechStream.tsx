import { AnimatePresence, motion } from 'motion/react';
import { MessageSquareQuote, Radio } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export function SpeechStream() {
  const { state } = useSimulation();
  const latest = [...state.speechStream].reverse().slice(0, 5);
  const currentSource = state.traversal.plan[state.traversal.currentIndex];
  const currentWord = latest[0]?.word;
  return <section className="panel relative flex min-h-80 flex-col items-center justify-center overflow-hidden p-6 pt-32 sm:min-h-[27rem]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,.17),transparent_43%)]" />
    <div className="absolute inset-x-5 top-5 z-10 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-[10px] uppercase tracking-[.32em] text-slate-500"><MessageSquareQuote className="h-4 w-4" />Child Speech Stream</p><span className="status-dot">Current word: {currentWord ?? 'none yet'}</span></div>
      <div className="rounded-xl border border-cyan-300/25 bg-[#07121e]/90 px-4 py-3 shadow-[0_0_30px_rgba(34,211,238,.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-cyan-100"><Radio className="h-4 w-4 shrink-0 text-cyan-300" />Speaking from: <span className="truncate text-white">{currentSource?.label ?? 'no source selected'}</span></p><span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">{state.childMode === 'source_exhausted' ? 'source exhausted · waiting' : currentSource ? 'source locked' : 'idle'}</span></div>
        <p className="mt-1 text-[10px] text-slate-500">Word {state.speechStream.length || 0} this run · {state.traversal.remainingWords.length} unused in this source · No repeats allowed</p>
      </div>
    </div>
    <div className="relative flex flex-col items-center gap-3 pt-8 text-center" aria-live="polite">
      <AnimatePresence initial={false}>
        {latest.map((speech, index) => <motion.div key={speech.id} initial={{ opacity: 0, y: -12, scale: .94 }} animate={{ opacity: Math.max(.16, 1 - index * .22), y: 0, scale: Math.max(.72, 1 - index * .08) }} className={index === 0 ? 'text-5xl font-light tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,.22)] sm:text-7xl' : 'text-2xl font-light text-white/50 sm:text-4xl'}>{speech.word}</motion.div>)}
      </AnimatePresence>
      {!latest.length && <div className="text-lg font-light italic text-white/20">Awaiting verbalization…</div>}
    </div>
  </section>;
}
