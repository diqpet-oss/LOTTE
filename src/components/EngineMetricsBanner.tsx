import React from 'react';
import { Crosshair, Sparkles, Filter, Percent, Disc } from 'lucide-react';
import { MarsGenerateResponse, V2GenerateResponse } from '../types';

interface EngineMetricsBannerProps {
  v2Data?: V2GenerateResponse | null;
  marsData?: MarsGenerateResponse | null;
  engineType: 'v2' | 'mars';
}

export const EngineMetricsBanner: React.FC<EngineMetricsBannerProps> = ({
  v2Data,
  marsData,
  engineType
}) => {
  if (engineType === 'v2' && v2Data) {
    const blueInf = v2Data.blueInference;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>V2 经典引擎 · 马尔可夫红蓝全维度量化推演</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                  马尔可夫状态矩阵
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                每注锁定 2~3 个预测胆码，奇偶比 {v2Data.summary.targetParity}、AC值 [{v2Data.summary.acRange[0]}-{v2Data.summary.acRange[1]}]，蓝球按一阶状态转移及遗漏回补推算
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              奇偶比: <strong className="text-blue-700">{v2Data.summary.targetParity}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              AC值范围: <strong className="text-blue-700">{v2Data.summary.acRange[0]}-{v2Data.summary.acRange[1]}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              蓝球推演覆盖: <strong className="text-blue-700">{v2Data.summary.blueCoverageCount}个高概率码</strong>
            </span>
          </div>
        </div>

        {/* Top 12 Red Bankers Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 mr-1">前区/红球预测胆码:</span>
          {v2Data.bankers.map((num) => (
            <div
              key={num}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{num < 10 ? `0${num}` : num}</span>
            </div>
          ))}
        </div>

        {/* Inferred Key Blue Balls Badges */}
        {blueInf && (
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-blue-600" />
                <span>基于历史数据推测重点蓝球 (非机械轮询/非连续123456):</span>
              </span>
              <span className="text-xs text-slate-500">
                {blueInf.strategyNote}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {blueInf.items.filter((x) => x.isTopRanked).map((item) => (
                <div
                  key={item.number}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="font-mono font-bold">{item.number < 10 ? `0${item.number}` : item.number}</span>
                  <span className="text-xs text-blue-700">
                    ({(item.probability * 100).toFixed(1)}% | 遗漏{item.omission}期)
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.status === 'hot'
                      ? 'bg-rose-100 text-rose-700'
                      : item.status === 'cold_rebound'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.status === 'hot' ? '热态' : item.status === 'cold_rebound' ? '遗漏回补' : '温态'}
                  </span>
                </div>
              ))}

              {blueInf.pairItems && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2 flex-wrap">
                  <span className="font-medium text-slate-500">重点后区对:</span>
                  {blueInf.pairItems.slice(0, 3).map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs">
                      {p.pair[0] < 10 ? `0${p.pair[0]}` : p.pair[0]}+{p.pair[1] < 10 ? `0${p.pair[1]}` : p.pair[1]}
                      <span className="text-slate-500 ml-1">({p.oddEven})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (engineType === 'mars' && marsData) {
    const { coveringDesign, coldMotherSet, motherSetOmissions, blueInference } = marsData;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>火星 (Mars) 独立引擎 · 旋转矩阵降维 ({coveringDesign.rule})</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                  旋转覆盖优化器
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                12个极限遗漏母集号码，全复式 {coveringDesign.theoreticalCombinations} 注压缩至 {coveringDesign.compressedTicketsCount} 注，压缩率达 {coveringDesign.compressionRatio}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 font-medium">
              <Percent className="w-3.5 h-3.5 text-purple-600" />
              压缩比率: <strong>{coveringDesign.compressionRatio}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              形态防御剔除: <strong>{coveringDesign.defenseFilteredCount}注无效票</strong>
            </span>
          </div>
        </div>

        {/* Cold Mother Set Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 mr-1">极限遗漏母集号码:</span>
          {coldMotherSet.map((num) => {
            const stat = motherSetOmissions.find((s) => s.number === num);
            return (
              <div
                key={num}
                title={`遗漏: ${stat?.omission || 0} 期 | Z-Score: ${stat?.zScore.toFixed(2)}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-mono text-xs font-bold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>{num < 10 ? `0${num}` : num}</span>
                <span className="text-xs text-purple-600 font-normal">({stat?.omission || 0}期)</span>
              </div>
            );
          })}
        </div>

        {/* Mars Blue Inference Badges */}
        {blueInference && (
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-purple-600" />
                <span>后区/蓝球量化概率推断 (拒绝对齐递增123456，依据历史转移与遗漏权重分配):</span>
              </span>
              <span className="text-xs text-slate-500">
                {blueInference.strategyNote}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {blueInference.items.filter((x) => x.isTopRanked).map((item) => (
                <div
                  key={item.number}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span className="font-mono font-bold">{item.number < 10 ? `0${item.number}` : item.number}</span>
                  <span className="text-xs text-purple-700">
                    ({(item.probability * 100).toFixed(1)}% | 遗漏{item.omission}期)
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.status === 'hot'
                      ? 'bg-rose-100 text-rose-700'
                      : item.status === 'cold_rebound'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.status === 'hot' ? '热态' : item.status === 'cold_rebound' ? '遗漏回补' : '温态'}
                  </span>
                </div>
              ))}

              {blueInference.pairItems && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2 flex-wrap">
                  <span className="font-medium text-slate-500">推荐后区组合:</span>
                  {blueInference.pairItems.slice(0, 3).map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs">
                      {p.pair[0] < 10 ? `0${p.pair[0]}` : p.pair[0]}+{p.pair[1] < 10 ? `0${p.pair[1]}` : p.pair[1]}
                      <span className="text-slate-500 ml-1">({p.oddEven})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
