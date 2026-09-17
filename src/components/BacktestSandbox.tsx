import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { Play, RotateCcw, TrendingDown, TrendingUp, Trophy, Award, ShieldAlert, BarChart2 } from 'lucide-react';
import { BacktestSummary, EngineType, PlayType } from '../types';

interface BacktestSandboxProps {
  playType: PlayType;
  engineType: EngineType;
  backtestData: BacktestSummary | null;
  onRunBacktest: (periods: number) => void;
  loading: boolean;
  targetIssue?: string;
}

export const BacktestSandbox: React.FC<BacktestSandboxProps> = ({
  playType,
  engineType,
  backtestData,
  onRunBacktest,
  loading,
  targetIssue
}) => {
  const [backtestPeriods, setBacktestPeriods] = useState<number>(40);

  const handleRun = () => {
    onRunBacktest(backtestPeriods);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      {/* Distinction & Isolation Banner */}
      <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold flex items-center gap-2">
            <span>【功能隔离提示：历史沙盘复盘实验区】</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">
              历史复盘专用
            </span>
          </div>
          <p className="text-purple-700 text-xs leading-relaxed">
            本区域仅用于对<strong>过往已开奖期数</strong>进行资金盈亏与回撤复盘测试。<strong>请勿与上方【第 {targetIssue || '----'} 期 当下即将开奖实战预测】搞混</strong>，两模块数据流向独立，互不混淆！
          </p>
        </div>
      </div>

      {/* Header with Run Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>沙盘历史推演 · 资金走势与回撤模拟</span>
              <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                历史沙盘
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              严格按照真实历史官方开奖号与官方浮动/固定奖金返奖规则，无前瞻偏误模拟过去多期资金盈亏曲线
            </p>
          </div>
        </div>

        {/* Backtest Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">推演跨度:</span>
            <select
              value={backtestPeriods}
              onChange={(e) => setBacktestPeriods(Number(e.target.value))}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value={20}>最近 20 期</option>
              <option value={35}>最近 35 期</option>
              <option value={50}>最近 50 期</option>
              <option value={70}>最近 70 期</option>
            </select>
          </div>

          <button
            id="run-backtest-btn"
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{loading ? '沙盘推演计算中...' : '开始历史推演'}</span>
          </button>
        </div>
      </div>

      {backtestData ? (
        <div className="space-y-5">
          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">推演期数</span>
              <span className="text-base font-bold font-mono text-slate-900">{backtestData.totalPeriods} 期</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">累计总投入</span>
              <span className="text-base font-bold font-mono text-blue-700">¥{backtestData.totalInvested}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">累计返奖</span>
              <span className="text-base font-bold font-mono text-emerald-600">¥{backtestData.totalReturned}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">累计净盈亏 (PnL)</span>
              <span
                className={`text-base font-bold font-mono flex items-center gap-1 ${
                  backtestData.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {backtestData.netPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {backtestData.netPnL >= 0 ? `+¥${backtestData.netPnL}` : `-¥${Math.abs(backtestData.netPnL)}`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">最大资金回撤</span>
              <span className="text-base font-bold font-mono text-rose-600">
                -¥{backtestData.maxDrawdown} ({backtestData.maxDrawdownPercent}%)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">命中周期胜率</span>
              <span className="text-base font-bold font-mono text-amber-700">{backtestData.winRate}%</span>
            </div>
          </div>

          {/* Recharts PnL Equity Curve */}
          <div className="h-64 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={backtestData.points}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="issue"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `#${val.slice(-3)}`}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `¥${val}`}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs space-y-1.5">
                          <div className="font-bold text-slate-900 flex justify-between gap-4">
                            <span>第 {d.issue} 期 ({d.date})</span>
                            <span className="text-purple-700 font-semibold">{d.hitTier}</span>
                          </div>
                          <div className="text-slate-600">
                            当期投入: <span className="text-blue-600 font-medium">¥{d.cost}</span> | 当期中奖:{' '}
                            <span className="text-emerald-600 font-medium">¥{d.winning}</span>
                          </div>
                          <div className="text-slate-600">
                            当期红球命中: <span className="text-rose-600 font-bold">{d.redHits}个</span> | 蓝球命中:{' '}
                            <span className="text-blue-600 font-bold">{d.blueHits}个</span>
                          </div>
                          <div className="border-t border-slate-100 pt-1 text-slate-700">
                            累计模拟 PnL:{' '}
                            <span
                              className={`font-bold ${
                                d.cumulativePnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {d.cumulativePnL >= 0 ? `+¥${d.cumulativePnL}` : `-¥${Math.abs(d.cumulativePnL)}`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativePnL"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pnlGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tier Award Hits Badges */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="font-medium">历史奖级命中统计:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.keys(backtestData.tierHits).length > 0 ? (
                Object.entries(backtestData.tierHits).map(([tier, count]) => (
                  <span
                    key={tier}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700"
                  >
                    {tier}: <strong className="text-emerald-600">{count}次</strong>
                  </span>
                ))
              ) : (
                <span className="text-slate-400">未捕获到固定/浮动奖项</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Play className="w-6 h-6 ml-0.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">沙盘回测待执行</h4>
            <p className="text-xs text-slate-500 max-w-md">
              点击右上角“开始历史推演”按钮，沙盘将重放过去数十期的真实开奖数据，自动计算所选算法引擎的资金净值走势和最大回撤。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
