import React from 'react';
import { Cpu, Terminal, RefreshCw, Calendar, Tag } from 'lucide-react';
import { EngineType, PlayType } from '../types';

interface NavbarProps {
  playType: PlayType;
  engineType: EngineType;
  onOpenCodeModal: () => void;
  onRefreshData: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  playType,
  engineType,
  onOpenCodeModal,
  onRefreshData,
  loading
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                彩票量化分析与推演平台
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                2026 最新基准
              </span>
            </div>
            <p className="text-xs text-slate-500">
              马尔可夫链状态转移 · 火星旋转矩阵覆盖 · 蓝球后验推断
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Current Date Anchor */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>基准时间: 2026年9月17日</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700 border border-slate-200">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-900">{playType === 'ssq' ? '双色球' : '超级大乐透'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">{engineType === 'v2' ? 'V2经典引擎' : '火星矩阵引擎'}</span>
          </div>

          {/* Code Inspection Modal Button */}
          <button
            id="view-python-code-btn"
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            <span>Python算法源码</span>
          </button>

          {/* Refresh / Recalculate Button */}
          <button
            id="recalc-engine-btn"
            onClick={onRefreshData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '计算中...' : '重新运算'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
