import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const RiskFooter: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-rose-200 backdrop-blur-md py-2.5 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-rose-900">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="text-xs leading-tight">
            <strong className="text-rose-700 font-semibold">[ 风险提示与理性警示 ]</strong>
            ：彩票开奖属于严格独立随机事件，量化模型、马尔可夫矩阵及旋转矩阵仅用于概率统计学实验与历史沙盘回测研究，不构成任何投注建议。单注成本与负期望不可逆，切勿过度沉迷，严禁未成年人购彩。
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 text-xs text-slate-500 font-medium">
          <span>量化中台审计通过</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>
    </footer>
  );
};
