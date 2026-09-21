import React, { useState, useMemo } from 'react';
import {
  PlayType,
  ExclusionFilterConfig
} from '../types';
import {
  estimateReductionRate,
  getDefaultFilterConfig
} from '../services/filterEngine';
import {
  Filter,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Star,
  Layers,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface SmartFilterPanelProps {
  playType: PlayType;
  filterConfig: ExclusionFilterConfig;
  onFilterConfigChange: (newConfig: ExclusionFilterConfig) => void;
  onApplyAndRecalculate: () => void;
  coldCandidateReds?: number[]; // Suggested cold numbers for quick kill
  disabled?: boolean;
}

export const SmartFilterPanel: React.FC<SmartFilterPanelProps> = ({
  playType,
  filterConfig,
  onFilterConfigChange,
  onApplyAndRecalculate,
  coldCandidateReds = [],
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeBallMode, setActiveBallMode] = useState<'kill_red' | 'banker_red' | 'kill_blue'>('kill_red');

  const totalReds = playType === 'ssq' ? 33 : 35;
  const totalBlues = playType === 'ssq' ? 16 : 12;
  const redBalls = useMemo(() => Array.from({ length: totalReds }, (_, i) => i + 1), [totalReds]);
  const blueBalls = useMemo(() => Array.from({ length: totalBlues }, (_, i) => i + 1), [totalBlues]);

  const { reductionRate, activeRulesCount } = useMemo(
    () => estimateReductionRate(filterConfig, playType),
    [filterConfig, playType]
  );

  // Toggle Red Ball
  const handleRedBallClick = (num: number) => {
    if (activeBallMode === 'kill_red') {
      const isKilled = filterConfig.killedReds.includes(num);
      const newKilled = isKilled
        ? filterConfig.killedReds.filter((n) => n !== num)
        : [...filterConfig.killedReds, num].sort((a, b) => a - b);
      
      // If killing a ball, remove it from bankers if present
      const newBankers = filterConfig.mustIncludeReds.filter((n) => n !== num);
      onFilterConfigChange({
        ...filterConfig,
        killedReds: newKilled,
        mustIncludeReds: newBankers
      });
    } else if (activeBallMode === 'banker_red') {
      const isBanker = filterConfig.mustIncludeReds.includes(num);
      let newBankers: number[];
      if (isBanker) {
        newBankers = filterConfig.mustIncludeReds.filter((n) => n !== num);
      } else {
        // Max 3 bankers
        if (filterConfig.mustIncludeReds.length >= 3) {
          alert('单组推演最多支持指定 3 个必选胆码');
          return;
        }
        newBankers = [...filterConfig.mustIncludeReds, num].sort((a, b) => a - b);
      }
      // If making it a banker, remove from killed
      const newKilled = filterConfig.killedReds.filter((n) => n !== num);
      onFilterConfigChange({
        ...filterConfig,
        mustIncludeReds: newBankers,
        killedReds: newKilled
      });
    }
  };

  // Toggle Blue Ball
  const handleBlueBallClick = (num: number) => {
    const isKilled = filterConfig.killedBlues.includes(num);
    const newKilled = isKilled
      ? filterConfig.killedBlues.filter((n) => n !== num)
      : [...filterConfig.killedBlues, num].sort((a, b) => a - b);
    onFilterConfigChange({
      ...filterConfig,
      killedBlues: newKilled
    });
  };

  // Quick action: Kill Top 3 Cold Reds
  const handleKillTopColdReds = () => {
    const toKill = coldCandidateReds.length >= 3 ? coldCandidateReds.slice(0, 3) : [3, 14, 27];
    const combined = Array.from(new Set([...filterConfig.killedReds, ...toKill])).sort((a, b) => a - b);
    onFilterConfigChange({
      ...filterConfig,
      killedReds: combined,
      mustIncludeReds: filterConfig.mustIncludeReds.filter((n) => !combined.includes(n))
    });
  };

  // Clear all manual balls
  const handleClearAllManualBalls = () => {
    onFilterConfigChange({
      ...filterConfig,
      killedReds: [],
      killedBlues: [],
      mustIncludeReds: []
    });
  };

  // Reset to system defaults
  const handleResetToDefaults = () => {
    onFilterConfigChange(getDefaultFilterConfig(playType));
  };

  // Master switch
  const handleToggleMasterSwitch = () => {
    onFilterConfigChange({
      ...filterConfig,
      enabled: !filterConfig.enabled
    });
  };

  // Toggle odd-even ratio
  const handleToggleOddEvenRatio = (ratio: string) => {
    const current = filterConfig.allowedOddEvenRatios;
    let updated: string[];
    if (current.includes(ratio)) {
      if (current.length === 1) {
        alert('至少保留一种允许的奇偶形态');
        return;
      }
      updated = current.filter((r) => r !== ratio);
    } else {
      updated = [...current, ratio];
    }
    onFilterConfigChange({
      ...filterConfig,
      allowedOddEvenRatios: updated
    });
  };

  const oddEvenOptions = playType === 'ssq'
    ? ['3:3', '4:2', '2:4', '5:1', '1:5']
    : ['3:2', '2:3', '4:1', '1:4', '5:0', '0:5'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 bg-linear-to-r from-slate-50/80 via-white to-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                智能形态过滤与排除缩水器
              </h3>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                filterConfig.enabled
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {filterConfig.enabled ? `已生效 ${activeRulesCount} 项规则 · 缩水 ${reductionRate}%` : '已旁路关闭'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              市面实战主流：支持号码绝杀排除、必选红胆锁定，以及和值/奇偶/连号/重号/质合五维深度剪枝
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleMasterSwitch}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              filterConfig.enabled
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-xs'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {filterConfig.enabled ? '过滤系统：开启' : '过滤系统：关闭'}
          </button>

          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            title="恢复系统统计学最优推荐配置"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>推荐预设</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Section 1: Number Specific Exclusions & Bankers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  第一步：指定绝杀号码与必选胆码 (点击球号即可标记)
                </span>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-medium">
                <button
                  onClick={() => setActiveBallMode('kill_red')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeBallMode === 'kill_red'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-300"></span>
                  <span>绝杀红球 ({filterConfig.killedReds.length})</span>
                </button>
                <button
                  onClick={() => setActiveBallMode('banker_red')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeBallMode === 'banker_red'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Star className="w-3 h-3 text-amber-200 fill-amber-200" />
                  <span>锁定红胆 ({filterConfig.mustIncludeReds.length}/3)</span>
                </button>
                <button
                  onClick={() => setActiveBallMode('kill_blue')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeBallMode === 'kill_blue'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                  <span>绝杀蓝球 ({filterConfig.killedBlues.length})</span>
                </button>
              </div>
            </div>

            {/* Ball Matrix */}
            <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                <span>
                  当前操作：
                  {activeBallMode === 'kill_red' && <strong className="text-rose-600 ml-1">点击红球以绝杀排除（出票时彻底杜绝）</strong>}
                  {activeBallMode === 'banker_red' && <strong className="text-amber-600 ml-1">点击红球以设为必出胆码（每注必含）</strong>}
                  {activeBallMode === 'kill_blue' && <strong className="text-blue-600 ml-1">点击蓝球以绝杀排除</strong>}
                </span>

                <div className="flex items-center gap-2">
                  {activeBallMode === 'kill_red' && coldCandidateReds.length > 0 && (
                    <button
                      onClick={handleKillTopColdReds}
                      className="text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      一键杀最冷3码
                    </button>
                  )}
                  {(filterConfig.killedReds.length > 0 || filterConfig.killedBlues.length > 0 || filterConfig.mustIncludeReds.length > 0) && (
                    <button
                      onClick={handleClearAllManualBalls}
                      className="text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                    >
                      清空球号标记
                    </button>
                  )}
                </div>
              </div>

              {/* Red Balls Grid */}
              {activeBallMode !== 'kill_blue' ? (
                <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-12 gap-1.5 sm:gap-2">
                  {redBalls.map((num) => {
                    const isKilled = filterConfig.killedReds.includes(num);
                    const isBanker = filterConfig.mustIncludeReds.includes(num);

                    let ballStyle = 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100';
                    if (isKilled) {
                      ballStyle = 'bg-rose-100 text-rose-700 border-rose-400 line-through font-extrabold shadow-inner';
                    } else if (isBanker) {
                      ballStyle = 'bg-amber-400 text-slate-900 border-amber-500 font-extrabold shadow-sm ring-2 ring-amber-300';
                    }

                    return (
                      <button
                        key={num}
                        onClick={() => handleRedBallClick(num)}
                        className={`h-9 w-full rounded-lg border text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${ballStyle}`}
                        title={isKilled ? `红球 ${num} (已绝杀)` : isBanker ? `红球 ${num} (已定胆)` : `点击标记红球 ${num}`}
                      >
                        {String(num).padStart(2, '0')}
                        {isKilled && (
                          <X className="w-3.5 h-3.5 text-rose-600 absolute right-0.5 top-0.5" strokeWidth={3} />
                        )}
                        {isBanker && (
                          <Star className="w-3 h-3 text-slate-900 fill-slate-900 absolute right-0.5 top-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Blue Balls Grid */
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 sm:gap-2">
                  {blueBalls.map((num) => {
                    const isKilled = filterConfig.killedBlues.includes(num);
                    let ballStyle = 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-blue-50';
                    if (isKilled) {
                      ballStyle = 'bg-rose-100 text-rose-700 border-rose-400 line-through font-extrabold';
                    }

                    return (
                      <button
                        key={num}
                        onClick={() => handleBlueBallClick(num)}
                        className={`h-9 w-full rounded-lg border text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${ballStyle}`}
                        title={isKilled ? `蓝球 ${num} (已绝杀)` : `点击绝杀蓝球 ${num}`}
                      >
                        {String(num).padStart(2, '0')}
                        {isKilled && (
                          <X className="w-3.5 h-3.5 text-rose-600 absolute right-0.5 top-0.5" strokeWidth={3} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Mathematical Dimension Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 和值区间过滤 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  和值区间 (红球之和)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {filterConfig.sumRange[0]} ~ {filterConfig.sumRange[1]}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                中心分布: {playType === 'ssq' ? '90~110' : '80~100'}，剔除两端极端和值
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">下限</label>
                  <input
                    type="number"
                    value={filterConfig.sumRange[0]}
                    onChange={(e) =>
                      onFilterConfigChange({
                        ...filterConfig,
                        sumRange: [Number(e.target.value), filterConfig.sumRange[1]]
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">上限</label>
                  <input
                    type="number"
                    value={filterConfig.sumRange[1]}
                    onChange={(e) =>
                      onFilterConfigChange({
                        ...filterConfig,
                        sumRange: [filterConfig.sumRange[0], Number(e.target.value)]
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. 奇偶形态过滤 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  奇偶比形态 (红球)
                </span>
                <span className="text-[11px] text-slate-500">多选生效</span>
              </div>
              <p className="text-[11px] text-slate-500">
                排除全奇全偶等极端离散比
              </p>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {oddEvenOptions.map((ratio) => {
                  const isChecked = filterConfig.allowedOddEvenRatios.includes(ratio);
                  return (
                    <button
                      key={ratio}
                      onClick={() => handleToggleOddEvenRatio(ratio)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ratio}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 连号形态剪枝 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  连号形态控制
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                三连号以上开出率仅 1.8%，严密剪枝
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  onClick={() =>
                    onFilterConfigChange({
                      ...filterConfig,
                      consecutiveMode: 'allow_pair_only'
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border ${
                    filterConfig.consecutiveMode === 'allow_pair_only'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✓ 允许最大2连号 (排除3+连号) [推荐]
                </button>
                <button
                  onClick={() =>
                    onFilterConfigChange({
                      ...filterConfig,
                      consecutiveMode: 'no_consecutive'
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border ${
                    filterConfig.consecutiveMode === 'no_consecutive'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✓ 严禁任何连号 (0连号)
                </button>
              </div>
            </div>

            {/* 4. 上期重号与质数 */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  与上期重号控制
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  历史开奖 85% 落在 0~2 个重号
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '0~2 个 (黄金区间)', range: [0, 2] as [number, number] },
                  { label: '1~2 个 (必有重号)', range: [1, 2] as [number, number] }
                ].map((item, idx) => {
                  const isActive =
                    filterConfig.repeatCountRange[0] === item.range[0] &&
                    filterConfig.repeatCountRange[1] === item.range[1];
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        onFilterConfigChange({
                          ...filterConfig,
                          repeatCountRange: item.range
                        })
                      }
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Reduction Metrics and Instant Execution Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-400">理论全空间剔除率 (剪枝深度)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    约 {reductionRate}%
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

              <div className="text-xs text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  当前已剔除偏态组合约 <strong>{reductionRate}%</strong>，推演将优先向高质量子空间集中，提升资金使用效率。
                </span>
              </div>
            </div>

            <button
              onClick={onApplyAndRecalculate}
              disabled={disabled}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>立即应用规则并重新推演</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
