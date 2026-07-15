import { SimulationProvider } from './context/SimulationContext';
import { TopBar } from './components/TopBar';
import { ChildStatus } from './components/ChildStatus';
import { MotherStatus } from './components/MotherStatus';
import { NeedControl } from './components/NeedControl';
import { MemoryPanels } from './components/MemoryPanels';
import { SpeechStream } from './components/SpeechStream';
import { BrainLog } from './components/BrainLog';
import { TraversalPanel } from './components/TraversalPanel';
import { MotherRulesPanel } from './components/MotherRulesPanel';
import { CurrentRunSummary } from './components/CurrentRunSummary';
import { LastRunReportPanel } from './components/LastRunReportPanel';
import { DryRunPanel } from './components/DryRunPanel';

function Dashboard() {
  return (
    <div className="min-h-screen font-sans text-slate-100 bg-[#030711] selection:bg-indigo-500/40">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_8%_0%,rgba(79,70,229,0.22),transparent_34%),radial-gradient(circle_at_95%_15%,rgba(190,24,93,0.12),transparent_30%)]" />
      <TopBar />
      <main className="relative mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:p-6">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-none lg:col-span-3">
          <ChildStatus />
          <MotherStatus />
          <BrainLog />
        </div>
        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-none lg:col-span-6">
          <CurrentRunSummary />
          <SpeechStream />
          <NeedControl />
          <TraversalPanel />
          <DryRunPanel />
        </div>
        <div className="order-3 flex min-w-0 flex-col gap-4 lg:order-none lg:col-span-3">
          <LastRunReportPanel />
          <MemoryPanels />
          <MotherRulesPanel />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <SimulationProvider><Dashboard /></SimulationProvider>;
}
