import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Database,
  ArrowRight,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { LotteryIssue, PlayType, TargetIssueInfo } from '../types';
import { calculateACValue, calculateOddEvenRatio, calculateSum } from '../services/lotteryData';

interface BaselineTargetBannerProps {
  playType: PlayType;
  targetInfo?: TargetIssueInfo;
  recentHistory: LotteryIssue[];
  onAddCustomDraw: (newDraw: LotteryIssue) => void;
  onResetHistory: () => void;
  isCustomized: boolean;
  selectedHistoricalOffset?: number;
  onSelectHistoricalOffset?: (offset: number) => void;
}

export const BaselineTargetBanner: React.FC<BaselineTargetBannerProps> = ({
  playType,
  targetInfo,
  recentHistory,
  onAddCustomDraw,
  onResetHistory,
  isCustomized,
  selectedHistoricalOffset = 0,
  onSelectHistoricalOffset
}) => {
  const [showRecentDrawer, setShowRecentDrawer] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);

  // Form state for adding new draw
  const [inputIssue, setInputIssue] = useState('');
  const [inputDate, setInputDate] = useState('');
  const [inputReds, setInputReds] = useState('');
  const [inputBlues, setInputBlues] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  if (!targetInfo) return null;

  const playName = playType === 'ssq' ? '双色球' : '超级大乐透';
  const redCount = playType === 'ssq' ? 6 : 5;
  const redMax = playType === 'ssq' ? 33 : 35;
  const blueCount = playType === 'ssq' ? 1 : 2;
  const blueMax = playType === 'ssq' ? 16 : 12;

  const formatNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Calculate baseline metrics
  const baselineSum = calculateSum(targetInfo.baselineReds);
  const baselineRatio = calculateOddEvenRatio(targetInfo.baselineReds).ratioStr;
  const baselineAC = calculateACValue(targetInfo.baselineReds);

  const handleOpenModal = () => {
    // Pre-fill next issue suggestion
    const nextGuess = targetInfo.targetIssue;
    setInputIssue(nextGuess);
    setInputDate(targetInfo.targetDrawDate || new Date().toISOString().split('T')[0]);
    setInputReds('');
    setInputBlues('');
    setInputError(null);
    setShowInputModal(true);
  };

  const handleSubmitDraw = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const reds = inputReds
        .trim()
        .split(/[\s,，]+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => !isNaN(n));

      const blues = inputBlues
        .trim()
        .split(/[\s,，]+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => !isNaN(n));

      if (reds.length !== redCount) {
        throw new Error(`${playName}红球需准确输入 ${redCount} 个号码`);
      }
      if (blues.length !== blueCount) {
        throw new Error(`${playName}蓝球需准确输入 ${blueCount} 个号码`);
      }
      const uniqueReds = new Set(reds);
      if (uniqueReds.size !== redCount) {
        throw new Error('红球号码不可重复');
      }
      for (const r of reds) {
        if (r < 1 || r > redMax) throw new Error(`红球号码必须在 01-${redMax} 之间`);
      }
      for (const b of blues) {
        if (b < 1 || b > blueMax) throw new Error(`蓝球号码必须在 01-${blueMax} 之间`);
      }

      onAddCustomDraw({
        issue: inputIssue.trim(),
        date: inputDate || new Date().toISOString().split('T')[0],
        reds: reds.sort((a, b) => a - b),
        blues: blues.sort((a, b) => a - b)
      });
      setShowInputModal(false);
    } catch (err: any) {
      setInputError(err.message || '输入格式错误');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Top Section Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>即将开奖期号推演 & 历史就近基准看板</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  实时开奖联动
                </span>
              </h2>
              <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>实时时间: {targetInfo.nowFormatted || '实时同步中'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              严格按照当下日历时钟动态追踪开奖节奏，以就近真实已开奖一期为输入基底，推演生成<strong>当下即将开奖的一期号</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCustomized && (
            <button
              onClick={onResetHistory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              title="恢复为内置官方标准就近基数"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置基准</span>
            </button>
          )}

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>录入最新开奖</span>
          </button>
        </div>
      </div>

      {/* Realtime Progression & Issue Switcher Bar */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">期号推演联动:</span>
          <button
            onClick={() => onSelectHistoricalOffset?.(0)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedHistoricalOffset === 0
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                selectedHistoricalOffset === 0 ? 'bg-emerald-300 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>当下实时待开 (第 {targetInfo.targetIssue} 期)</span>
          </button>

          {recentHistory.slice(0, 4).map((h, i) => (
            <button
              key={h.issue}
              onClick={() => onSelectHistoricalOffset?.(i + 1)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedHistoricalOffset === i + 1
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
              title={`回溯推演第 ${h.issue} 期基于之前数据的生成状态`}
            >
              <span>第 {h.issue} 期 ({h.date.slice(5)})</span>
            </button>
          ))}
        </div>

        {selectedHistoricalOffset > 0 && (
          <button
            onClick={() => onSelectHistoricalOffset?.(0)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>返回当下实时待开期</span>
          </button>
        )}
      </div>

      {/* Main Dual Card Comparison Layout */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Box: TARGET UPCOMING DRAW (当下即将开奖的一期) */}
        <div className="relative rounded-xl bg-blue-50/50 border border-blue-200 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-600 text-white">
                  本次量化生成目标
                </span>
                <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                  {targetInfo.isToday ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold border border-rose-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                      今晚开奖 ({targetInfo.targetDrawDate})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                      待开奖 ({targetInfo.targetDrawDate})
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  第 {targetInfo.targetIssue} 期
                </h3>
                <span className="text-xs font-medium text-slate-500">({playName})</span>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500">
              <div className="flex items-center justify-end gap-1 text-blue-700 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>{targetInfo.targetDrawDate}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-slate-500 text-xs mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{targetInfo.targetDayOfWeek} 开奖</span>
              </div>
              {targetInfo.countdown && (
                <div className="mt-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[11px] font-semibold flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>倒计时: {targetInfo.countdown}</span>
                </div>
              )}
            </div>
          </div>

          {/* Operational Statement */}
          <div className="p-3 rounded-lg bg-white border border-blue-100 text-xs text-slate-600 space-y-1">
            <div className="text-blue-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>下方推荐票面全部严格对应【第 {targetInfo.targetIssue} 期】</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              基于马尔可夫转移矩阵计算与旋转矩阵覆盖设计，推演生成待开奖期号的胆码、奇偶组合及蓝球后验概率分配。
            </p>
          </div>
        </div>

        {/* Right Box: NEAREST BASELINE DRAW (数据导入的历史就近基数) */}
        <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-200 text-slate-700">
                  导入数据就近基准
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Database className="w-3 h-3 text-slate-400" />
                  已开奖官方最新一期
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                  第 {targetInfo.baselineIssue} 期
                </h3>
                <span className="text-xs text-slate-500">开奖日: {targetInfo.baselineDrawDate}</span>
              </div>
            </div>

            <button
              onClick={() => setShowRecentDrawer(!showRecentDrawer)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1 px-2.5 rounded bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
            >
              <span>{showRecentDrawer ? '收起基数列表' : '查看近5期基数'}</span>
              {showRecentDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Balls & Attributes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 mr-1">开奖号:</span>
                {targetInfo.baselineReds.map((r, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-rose-600 text-white shadow-xs"
                  >
                    {formatNumber(r)}
                  </span>
                ))}
                <span className="text-slate-400 mx-0.5 font-bold">+</span>
                {targetInfo.baselineBlues.map((b, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-blue-600 text-white shadow-xs"
                  >
                    {formatNumber(b)}
                  </span>
                ))}
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <span>和值: <strong className="text-slate-900">{baselineSum}</strong></span>
                <span>奇偶: <strong className="text-slate-900">{baselineRatio}</strong></span>
                <span>AC值: <strong className="text-slate-900">{baselineAC}</strong></span>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>统计就近样本容量:</span>
              <strong className="text-slate-800">紧邻近 {targetInfo.historySampleCount} 期</strong>
              <span className="text-slate-400">（无任何跨周期掺杂）</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Recent 5 Issues Drawer */}
      {showRecentDrawer && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50 text-xs">
          <div className="text-slate-700 font-semibold mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>系统导入的最近连续 5 期开奖数据基准核对表:</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-lg border border-slate-200">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs">
                  <th className="py-2 px-3">期号</th>
                  <th className="py-2 px-3">开奖日期</th>
                  <th className="py-2 px-3">红球号码</th>
                  <th className="py-2 px-3">蓝球号码</th>
                  <th className="py-2 px-3">和值</th>
                  <th className="py-2 px-3">奇偶比</th>
                  <th className="py-2 px-3">AC值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {recentHistory.slice(0, 5).map((h, idx) => (
                  <tr key={h.issue} className={idx === 0 ? 'bg-blue-50/50 font-medium' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {h.issue} {idx === 0 ? '(最新基准)' : ''}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{h.date}</td>
                    <td className="py-2 px-3 font-mono text-rose-600 font-bold">
                      {h.reds.map(formatNumber).join(' ')}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-600 font-bold">
                      {h.blues.map(formatNumber).join(' ')}
                    </td>
                    <td className="py-2 px-3">{calculateSum(h.reds)}</td>
                    <td className="py-2 px-3">{calculateOddEvenRatio(h.reds).ratioStr}</td>
                    <td className="py-2 px-3">{calculateACValue(h.reds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Input Modal for Latest Draw */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>录入最新实际开奖号 (更新就近基准)</span>
              </h3>
              <button
                onClick={() => setShowInputModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕ 取消
              </button>
            </div>

            <p className="text-xs text-slate-500">
              若刚刚已开出新一期，在此录入该期实际开奖号后，系统将自动将该期存为最新就近基准，并顺延推演<strong>接下来的下一期待开奖期号</strong>！
            </p>

            {inputError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDraw} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">刚开奖期号:</label>
                  <input
                    type="text"
                    required
                    value={inputIssue}
                    onChange={(e) => setInputIssue(e.target.value)}
                    placeholder="如 2024096"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">开奖日期:</label>
                  <input
                    type="date"
                    required
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">
                  红球号码 ({redCount}个，用空格或逗号隔开，范围 01-{redMax}):
                </label>
                <input
                  type="text"
                  required
                  value={inputReds}
                  onChange={(e) => setInputReds(e.target.value)}
                  placeholder={playType === 'ssq' ? '如 02 08 15 21 24 33' : '如 03 11 19 24 32'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-rose-600 font-mono font-medium focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">
                  蓝球号码 ({blueCount}个，用空格或逗号隔开，范围 01-{blueMax}):
                </label>
                <input
                  type="text"
                  required
                  value={inputBlues}
                  onChange={(e) => setInputBlues(e.target.value)}
                  placeholder={playType === 'ssq' ? '如 08' : '如 04 11'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-blue-600 font-mono font-medium focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer"
                >
                  确认导入并立即更新推演
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
