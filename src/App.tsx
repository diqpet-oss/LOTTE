import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DualEnginePanel } from './components/DualEnginePanel';
import { BaselineTargetBanner } from './components/BaselineTargetBanner';
import { EngineMetricsBanner } from './components/EngineMetricsBanner';
import { VisualCharts } from './components/VisualCharts';
import { TicketList } from './components/TicketList';
import { BacktestSandbox } from './components/BacktestSandbox';
import { PythonSourceModal } from './components/PythonSourceModal';
import { RiskFooter } from './components/RiskFooter';
import { BacktestSummary, EngineType, LotteryIssue, MarsGenerateResponse, PlayType, V2GenerateResponse } from './types';
import { runMarkovEngine } from './services/markovEngine';
import { runMarsEngine } from './services/marsEngine';
import { runSandboxBacktest } from './services/backtestEngine';
import { getHistoricalData } from './services/lotteryData';
import { useRealtimeLottery } from './hooks/useRealtimeLottery';

export default function App() {
  const [playType, setPlayType] = useState<PlayType>('ssq');
  const [engineType, setEngineType] = useState<EngineType>('v2');
  const [historyLimit, setHistoryLimit] = useState<number>(50);
  const [ticketCount, setTicketCount] = useState<number>(20);
  const [selectedHistoricalOffset, setSelectedHistoricalOffset] = useState<number>(0);

  // Custom baseline draw storage per play type
  const [customHistories, setCustomHistories] = useState<Record<PlayType, LotteryIssue[] | null>>({
    ssq: null,
    dlt: null
  });

  const [v2Data, setV2Data] = useState<V2GenerateResponse | null>(null);
  const [marsData, setMarsData] = useState<MarsGenerateResponse | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestSummary | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  // Retrieve current active baseline history
  const activeCustomHistory = customHistories[playType];
  const activeFullHistory = activeCustomHistory || getHistoricalData(playType, 100);

  // Core execution function for current engine
  const executeEngineCalculation = useCallback(async () => {
    setLoading(true);
    try {
      const fullList = customHistories[playType] || getHistoricalData(playType, 100);
      const activeList = selectedHistoricalOffset > 0 ? fullList.slice(selectedHistoricalOffset) : fullList;

      if (engineType === 'v2') {
        try {
          const res = await fetch('/api/v2/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              play_type: playType,
              history_limit: historyLimit,
              ticket_count: ticketCount,
              custom_history: activeList
            })
          });
          if (res.ok) {
            const data = await res.json();
            setV2Data(data);
          } else {
            throw new Error('API response not ok');
          }
        } catch {
          const localData = runMarkovEngine(playType, historyLimit, ticketCount, activeList);
          setV2Data(localData);
        }
      } else {
        try {
          const res = await fetch('/api/mars/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              play_type: playType,
              history_limit: historyLimit,
              ticket_limit: ticketCount,
              custom_history: activeList
            })
          });
          if (res.ok) {
            const data = await res.json();
            setMarsData(data);
          } else {
            throw new Error('API response not ok');
          }
        } catch {
          const localData = runMarsEngine(playType, historyLimit, ticketCount, activeList);
          setMarsData(localData);
        }
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  }, [playType, engineType, historyLimit, ticketCount, customHistories, selectedHistoricalOffset]);

  // Real-time live lottery clock and schedule tracker
  const { scheduleInfo, currentLiveTime } = useRealtimeLottery(
    playType,
    activeFullHistory,
    executeEngineCalculation
  );

  // Initial & reactive trigger
  useEffect(() => {
    executeEngineCalculation();
  }, [executeEngineCalculation]);

  // Trigger historical backtest simulation
  const handleRunBacktest = async (periods: number) => {
    setBacktestLoading(true);
    try {
      try {
        const res = await fetch('/api/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            play_type: playType,
            engine_type: engineType,
            periods,
            tickets_per_period: ticketCount
          })
        });
        if (res.ok) {
          const data = await res.json();
          setBacktestData(data);
        } else {
          throw new Error('Backtest API error');
        }
      } catch {
        const localBacktest = runSandboxBacktest(playType, engineType, periods, ticketCount);
        setBacktestData(localBacktest);
      }
    } catch (err) {
      console.error('Backtest error:', err);
    } finally {
      setBacktestLoading(false);
    }
  };

  // Run backtest automatically on initial load as well
  useEffect(() => {
    handleRunBacktest(40);
  }, [playType, engineType]);

  // Ingest custom new draw baseline
  const handleAddCustomDraw = (newDraw: LotteryIssue) => {
    const currentList = customHistories[playType] || getHistoricalData(playType, 100);
    const updated = [newDraw, ...currentList.filter((x) => x.issue !== newDraw.issue)];
    setCustomHistories((prev) => ({
      ...prev,
      [playType]: updated
    }));
  };

  // Reset baseline to default
  const handleResetHistory = () => {
    setCustomHistories((prev) => ({
      ...prev,
      [playType]: null
    }));
  };

  const currentTickets =
    engineType === 'v2' ? v2Data?.tickets || [] : marsData?.tickets || [];
  const currentCost =
    engineType === 'v2' ? v2Data?.costRMB || 0 : marsData?.costRMB || 0;
  const currentMarkovProbs = v2Data?.markovProbs || [];
  const baseTargetInfo =
    engineType === 'v2' ? v2Data?.targetIssueInfo : marsData?.targetIssueInfo;

  const activeTargetInfo = useMemo(() => {
    if (!baseTargetInfo) return undefined;
    if (selectedHistoricalOffset === 0) {
      return {
        ...baseTargetInfo,
        targetIssue: scheduleInfo.targetIssue,
        targetDrawDate: scheduleInfo.targetDrawDate,
        targetDayOfWeek: scheduleInfo.targetDayOfWeek,
        isToday: scheduleInfo.isToday,
        countdown: scheduleInfo.countdown,
        nowFormatted: currentLiveTime
      };
    }
    return {
      ...baseTargetInfo,
      nowFormatted: currentLiveTime
    };
  }, [baseTargetInfo, selectedHistoricalOffset, scheduleInfo, currentLiveTime]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* Top Navigation */}
      <Navbar
        playType={playType}
        engineType={engineType}
        targetInfo={activeTargetInfo}
        currentLiveTime={currentLiveTime}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        onRefreshData={executeEngineCalculation}
        loading={loading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Module 1: Dual Engine Control Panel with Dynamic Sliders & Circuit Breaker */}
        <DualEnginePanel
          playType={playType}
          engineType={engineType}
          historyLimit={historyLimit}
          ticketCount={ticketCount}
          targetInfo={activeTargetInfo}
          onPlayTypeChange={setPlayType}
          onEngineTypeChange={setEngineType}
          onHistoryLimitChange={setHistoryLimit}
          onTicketCountChange={setTicketCount}
          actualTicketCount={currentTickets.length}
        />

        {/* Module 2: Dedicated Baseline & Target Upcoming Issue Cockpit */}
        <BaselineTargetBanner
          playType={playType}
          targetInfo={activeTargetInfo}
          recentHistory={activeFullHistory}
          onAddCustomDraw={handleAddCustomDraw}
          onResetHistory={handleResetHistory}
          isCustomized={Boolean(customHistories[playType])}
          selectedHistoricalOffset={selectedHistoricalOffset}
          onSelectHistoricalOffset={setSelectedHistoricalOffset}
        />

        {/* Module 3: Engine Status & Mathematical Metrics Banner */}
        <EngineMetricsBanner
          v2Data={v2Data}
          marsData={marsData}
          engineType={engineType}
        />

        {/* Module 4: Probability & Cold-Hot Distribution Charts */}
        <VisualCharts
          playType={playType}
          markovProbs={currentMarkovProbs}
          blueInference={engineType === 'v2' ? v2Data?.blueInference : marsData?.blueInference}
        />

        {/* Module 5: Generated Ticket Sequence List (Strictly for upcoming target issue) */}
        <TicketList
          tickets={currentTickets}
          playType={playType}
          engineType={engineType}
          costRMB={currentCost}
          targetInfo={activeTargetInfo}
        />

        {/* Module 6: Sandboxed Historical Deduction Backtest Cockpit (Isolated) */}
        <BacktestSandbox
          playType={playType}
          engineType={engineType}
          backtestData={backtestData}
          onRunBacktest={handleRunBacktest}
          loading={backtestLoading}
          targetIssue={activeTargetInfo?.targetIssue}
        />
      </main>

      {/* Python Code Viewer Modal */}
      <PythonSourceModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Mandatory Fixed Risk Footer */}
      <RiskFooter />
    </div>
  );
}
