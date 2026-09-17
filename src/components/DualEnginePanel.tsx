import React from 'react';
import { AlertTriangle, Dna, Flame, Layers, ShieldCheck, Zap, Target } from 'lucide-react';
import { EngineType, PlayType, TargetIssueInfo } from '../types';

interface DualEnginePanelProps {
  playType: PlayType;
  engineType: EngineType;
  historyLimit: number;
  ticketCount: number;
  targetInfo?: TargetIssueInfo;
  onPlayTypeChange: (type: PlayType) => void;
  onEngineTypeChange: (engine: EngineType) => void;
  onHistoryLimitChange: (val: number) => void;
  onTicketCountChange: (val: number) => void;
  actualTicketCount?: number;
}

export const DualEnginePanel: React.FC<DualEnginePanelProps> = ({
  playType,
  engineType,
  historyLimit,
  ticketCount,
  targetInfo,
  onPlayTypeChange,
  onEngineTypeChange,
  onHistoryLimitChange,
  onTicketCountChange,
  actualTicketCount
}) => {
  const currentTickets = actualTicketCount !== undefined ? actualTicketCount : ticketCount;
  const costRMB = currentTickets * 2;
  const isCostCircuitBreaker = costRMB > 2000;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
      {/* Target & Baseline status indicator */}
      {targetInfo && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>推演生成目标: 第 {targetInfo.targetIssue} 期 (待开奖)</span>
            </span>
            <span className="text-slate-500">
              就近基准输入: <strong className="text-slate-800">第 {targetInfo.baselineIssue} 期</strong> ({targetInfo.baselineDrawDate})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>就近基准状态就绪 · 待开奖推演模式</span>
          </div>
        </div>
      )}

      {/* Top Section: Dual Engine Toggle Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
        {/* Toggle 1: Play Type (SSQ vs DLT) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>玩法选择</span>
            <span className="text-blue-600 font-bold">{playType === 'ssq' ? '双色球 (SSQ)' : '超级大乐透 (DLT)'}</span>
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              id="toggle-playtype-ssq"
              onClick={() => onPlayTypeChange('ssq')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                playType === 'ssq'
                  ? 'bg-white text-rose-700 shadow-xs border border-rose-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>双色球 (6+1)</span>
            </button>
            <button
              id="toggle-playtype-dlt"
              onClick={() => onPlayTypeChange('dlt')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                playType === 'dlt'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>大乐透 (5+2)</span>
            </button>
          </div>
        </div>

        {/* Toggle 2: Engine Strategy (V2 Classic vs Mars Covering) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>核心算法引擎</span>
            <span className={engineType === 'v2' ? 'text-blue-600 font-bold' : 'text-purple-600 font-bold'}>
              {engineType === 'v2' ? 'V2 经典马尔可夫引擎' : '火星 (Mars) 旋转矩阵引擎'}
            </span>
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              id="toggle-engine-v2"
              onClick={() => onEngineTypeChange('v2')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                engineType === 'v2'
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Dna className="w-3.5 h-3.5 text-blue-600" />
              <span>V2 马尔可夫+蒙特卡洛</span>
            </button>
            <button
              id="toggle-engine-mars"
              onClick={() => onEngineTypeChange('mars')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                engineType === 'mars'
                  ? 'bg-white text-purple-700 shadow-xs border border-purple-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-purple-600" />
              <span>火星 (Mars) 降维矩阵</span>
            </button>
          </div>
        </div>
      </div>

      {/* Middle Section: Sliders and Cost info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
        {/* Slider 1: History Backtest Limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              历史回溯期数
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold">
              {historyLimit} 期
            </span>
          </div>
          <input
            id="history-limit-slider"
            type="range"
            min={20}
            max={100}
            step={5}
            value={historyLimit}
            onChange={(e) => onHistoryLimitChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>20期 (近期样本)</span>
            <span>50期 (标准基准)</span>
            <span>100期 (长波分析)</span>
          </div>
        </div>

        {/* Slider 2: Generated Ticket Count with Cost Circuit Breaker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1.5 font-medium">
              <Zap className={`w-3.5 h-3.5 ${isCostCircuitBreaker ? 'text-rose-600' : 'text-amber-600'}`} />
              生成注数
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded border text-xs font-bold transition-colors ${
                  isCostCircuitBreaker
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {ticketCount} 注
              </span>
              <span
                className={`text-xs font-semibold ${
                  isCostCircuitBreaker ? 'text-rose-600 font-bold' : 'text-slate-700'
                }`}
              >
                ¥{costRMB} 元
              </span>
            </div>
          </div>

          <input
            id="ticket-count-slider"
            type="range"
            min={5}
            max={1200}
            step={5}
            value={ticketCount}
            onChange={(e) => onTicketCountChange(Number(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${
              isCostCircuitBreaker
                ? 'bg-rose-100 accent-rose-600'
                : 'bg-slate-200 accent-blue-600'
            }`}
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>5注 (¥10)</span>
            <span>50注 (¥100)</span>
            <span className="text-rose-500 font-medium">1000+注 (&gt;2000元预警)</span>
          </div>
        </div>
      </div>

      {/* Circuit Breaker Warning Alert */}
      {isCostCircuitBreaker && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>资金预算提示</strong>：单期理论成本已达 ¥{costRMB} 元（超过 2000 元建议上限），请注意控制投注规模。
            </span>
          </div>
          <button
            onClick={() => onTicketCountChange(25)}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shrink-0 transition-colors cursor-pointer"
          >
            重置为25注
          </button>
        </div>
      )}
    </div>
  );
};
