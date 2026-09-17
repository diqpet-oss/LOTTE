import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { BarChart3, Flame, TrendingUp, Info, Disc } from 'lucide-react';
import { BlueInferenceSummary, MarkovNumberProb, PlayType } from '../types';

interface VisualChartsProps {
  playType: PlayType;
  markovProbs: MarkovNumberProb[];
  blueInference?: BlueInferenceSummary;
}

export const VisualCharts: React.FC<VisualChartsProps> = ({ playType, markovProbs, blueInference }) => {
  const [activeTab, setActiveTab] = useState<'markov' | 'omission' | 'blue'>('markov');

  // Chart data for Markov Probability
  const markovData = markovProbs.map((item) => ({
    name: item.number < 10 ? `0${item.number}` : `${item.number}`,
    number: item.number,
    prob: item.probability,
    isBanker: item.isBanker,
    freq: item.frequency,
    omission: item.currentOmission
  }));

  // Chart data for Omission & Frequency
  const sortedByOmission = [...markovData].sort((a, b) => b.omission - a.omission);

  // Chart data for Blue Ball Inference
  const blueChartData = (blueInference?.items || []).map((b) => ({
    name: b.number < 10 ? `0${b.number}` : `${b.number}`,
    number: b.number,
    prob: Math.round(b.probability * 1000) / 10,
    isTop: b.isTopRanked,
    omission: b.omission,
    freq: b.frequency,
    status: b.status
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      {/* Chart Header & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            {activeTab === 'markov' ? (
              <TrendingUp className="w-4 h-4" />
            ) : activeTab === 'omission' ? (
              <Flame className="w-4 h-4 text-purple-600" />
            ) : (
              <Disc className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>
                {activeTab === 'markov'
                  ? '马尔可夫状态转移 · 胆码概率分布'
                  : activeTab === 'omission'
                  ? '历史冷热遗漏分布 · 极冷母集挖掘'
                  : '历史数据蓝球推测 · 状态转移与遗漏回补分布'}
              </span>
              <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600 font-medium">
                {activeTab === 'blue'
                  ? playType === 'ssq'
                    ? '蓝球 01-16'
                    : '后区 01-12'
                  : playType === 'ssq'
                  ? '红球 01-33'
                  : '前区 01-35'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'markov'
                ? '基于连续两期状态转移统计，高亮标记 TOP 12 核心红球胆码'
                : activeTab === 'omission'
                ? '统计当前红球未开出期数 (Omission)，偏离度最高者构成火星极冷复式母集'
                : '基于历史开奖的一阶马尔可夫转移、遗漏期数与贝叶斯后验概率，杜绝机械顺序轮询'}
            </p>
          </div>
        </div>

        {/* Chart View Toggle Switch */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('markov')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'markov'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            红球马尔可夫
          </button>
          <button
            onClick={() => setActiveTab('omission')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'omission'
                ? 'bg-white text-purple-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            冷热遗漏
          </button>
          <button
            onClick={() => setActiveTab('blue')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'blue'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Disc className="w-3 h-3 text-blue-600" />
            <span>蓝球数据推测</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'markov' ? (
            <BarChart data={markovData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                interval={0}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-slate-900 flex items-center justify-between gap-4">
                          <span>号码: #{data.name}</span>
                          {data.isBanker && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                              TOP 胆码
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600">
                          马尔可夫转移概率: <span className="text-emerald-600 font-bold">{data.prob}%</span>
                        </div>
                        <div className="text-slate-500">
                          当前遗漏: <span className="text-slate-800 font-medium">{data.omission} 期</span>
                        </div>
                        <div className="text-slate-500">
                          历史频次: <span className="text-blue-600 font-medium">{data.freq} 次</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                {markovData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isBanker ? '#e11d48' : '#3b82f6'}
                    opacity={entry.isBanker ? 0.95 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : activeTab === 'omission' ? (
            <BarChart data={sortedByOmission} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                interval={0}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                unit="期"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-purple-700">号码: #{data.name}</div>
                        <div className="text-slate-600">
                          当前遗漏期数: <span className="text-purple-600 font-bold">{data.omission} 期</span>
                        </div>
                        <div className="text-slate-500">
                          历史累计开出: <span className="text-blue-600 font-medium">{data.freq} 次</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="omission" radius={[4, 4, 0, 0]}>
                {sortedByOmission.map((entry, index) => (
                  <Cell
                    key={`cell-om-${index}`}
                    fill={index < 12 ? '#9333ea' : '#6366f1'}
                    opacity={index < 12 ? 0.95 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={blueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                interval={0}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-blue-700 flex items-center justify-between gap-4">
                          <span>蓝球: #{data.name}</span>
                          {data.isTop && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                              重点推测蓝胆
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600">
                          推断后验概率: <span className="text-blue-600 font-bold">{data.prob}%</span>
                        </div>
                        <div className="text-slate-500">
                          当前遗漏: <span className="text-slate-800 font-medium">{data.omission} 期</span>
                        </div>
                        <div className="text-slate-500">
                          历史开出频次: <span className="text-blue-600 font-medium">{data.freq} 次</span>
                        </div>
                        <div className="text-slate-500 text-xs">
                          形态评级: <span className="text-slate-800 font-medium">
                            {data.status === 'hot' ? '活跃热态' : data.status === 'cold_rebound' ? '极限遗漏回补' : '平稳温态'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                {blueChartData.map((entry, index) => (
                  <Cell
                    key={`cell-blue-${index}`}
                    fill={entry.isTop ? '#2563eb' : '#60a5fa'}
                    opacity={entry.isTop ? 0.95 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Analytical Annotations */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          {activeTab === 'blue' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                <span className="text-blue-700 font-medium">重点推测蓝球</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-300" />
                <span>次级候选蓝球</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                <span>Top 12 核心红球胆码</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 opacity-60" />
                <span>常规概率态球号</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-purple-600" />
                <span>极冷遗漏偏离母集</span>
              </div>
            </>
          )}
        </div>
        <div className="text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>
            {activeTab === 'blue'
              ? '蓝球概率结合就近一阶转移、遗漏期望及后区形态量化计算'
              : '图表数据基于当前历史期数自动重新拟合与平滑计算'}
          </span>
        </div>
      </div>
    </div>
  );
};
