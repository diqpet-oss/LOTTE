import React, { useState } from 'react';
import { Check, Copy, CheckCircle2, Target, FileText } from 'lucide-react';
import { GeneratedTicket, PlayType, TargetIssueInfo } from '../types';

interface TicketListProps {
  tickets: GeneratedTicket[];
  playType: PlayType;
  engineType: 'v2' | 'mars';
  costRMB: number;
  targetInfo?: TargetIssueInfo;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  playType,
  engineType: _engineType,
  costRMB,
  targetInfo
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMode, setCopiedMode] = useState<'pure' | 'standard' | null>(null);

  const formatNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const playName = playType === 'ssq' ? '双色球' : '超级大乐透';

  // 1. 复制单注：纯号码格式 (如 04 06 11 14 19 26 + 15)
  const handleCopySingleTicket = (ticket: GeneratedTicket) => {
    const redStr = ticket.reds.map(formatNumber).join(' ');
    const blueStr = ticket.blues.map(formatNumber).join(' ');
    const pureText = `${redStr} + ${blueStr}`;
    navigator.clipboard.writeText(pureText);
    setCopiedId(ticket.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // 2. 一键复制全部：纯号码（每行一注，无任何多余分析文字，直接打票）
  const handleCopyAllPureNumbers = () => {
    const lines = tickets.map((t) => {
      const redStr = t.reds.map(formatNumber).join(' ');
      const blueStr = t.blues.map(formatNumber).join(' ');
      return `${redStr} + ${blueStr}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMode('pure');
    setTimeout(() => setCopiedMode(null), 2000);
  };

  // 3. 复制标准带序号格式
  const handleCopyAllWithIndex = () => {
    const header = `${playName} 第${targetInfo?.targetIssue || ''}期推荐号码 (共${tickets.length}注):`;
    const lines = tickets.map((t, idx) => {
      const redStr = t.reds.map(formatNumber).join(' ');
      const blueStr = t.blues.map(formatNumber).join(' ');
      const num = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      return `${num}: ${redStr} + ${blueStr}`;
    });
    navigator.clipboard.writeText([header, ...lines].join('\n'));
    setCopiedMode('standard');
    setTimeout(() => setCopiedMode(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{playName} 第 {targetInfo?.targetIssue || '----'} 期 推荐号码</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                  待开奖预测
                </span>
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                共 {tickets.length} 注 · 合计 ¥{costRMB}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              基准数据：第 {targetInfo?.baselineIssue || '----'} 期 ({targetInfo?.baselineDrawDate}) | 
              预计开奖：{targetInfo?.targetDrawDate} ({targetInfo?.targetDayOfWeek})
            </p>
          </div>
        </div>

        {/* Copy Buttons: Clean Pure Numbers */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="copy-all-pure-btn"
            onClick={handleCopyAllPureNumbers}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
            title="复制干净的纯号码，方便直接粘贴打票"
          >
            {copiedMode === 'pure' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedMode === 'pure' ? '已复制全部纯号码' : '一键复制纯号码 (去分析)'}</span>
          </button>

          <button
            id="copy-all-with-index-btn"
            onClick={handleCopyAllWithIndex}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all border border-slate-200 active:scale-95 cursor-pointer"
            title="复制带序号与期号格式"
          >
            {copiedMode === 'standard' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedMode === 'standard' ? '已复制带序号' : '复制带序号'}</span>
          </button>
        </div>
      </div>

      {/* Clean Ticket Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {tickets.map((t, index) => {
          const redText = t.reds.map(formatNumber).join(' ');
          const blueText = t.blues.map(formatNumber).join(' ');

          return (
            <div
              key={t.id || index}
              className="group relative p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 hover:border-blue-400 transition-all shadow-xs flex flex-col justify-between gap-2.5"
            >
              {/* Row Header: Just Clean Ticket ID and Quick Copy */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    第 {index + 1 < 10 ? `0${index + 1}` : index + 1} 注
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {t.id}
                  </span>
                </div>

                <button
                  onClick={() => handleCopySingleTicket(t)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 text-xs font-medium transition-colors cursor-pointer"
                  title="点击复制此注纯号码"
                >
                  {copiedId === t.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 text-[11px]">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[11px]">复制</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lottery Balls Row (Pure Numbers, No Clutter) */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                {/* Red Balls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.reds.map((r, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-rose-600 text-white shadow-xs"
                    >
                      {formatNumber(r)}
                    </div>
                  ))}
                </div>

                {/* Separator */}
                <span className="text-slate-400 font-bold text-sm px-1">+</span>

                {/* Blue Balls */}
                <div className="flex items-center gap-1.5">
                  {t.blues.map((b, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-blue-600 text-white shadow-xs"
                    >
                      {formatNumber(b)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Number string for quick view */}
              <div className="text-[11px] text-slate-500 font-mono tracking-wide">
                纯文本：<span className="font-semibold text-slate-800">{redText} + {blueText}</span>
              </div>

              {/* Smart Filter Verification Badges */}
              {t.filterReasons && t.filterReasons.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    缩水校验
                  </span>
                  {t.filterReasons.slice(0, 4).map((reason, rIdx) => (
                    <span
                      key={rIdx}
                      className="text-[10px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Tip Notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>号码后已彻底去除 (奇偶、AC、和值) 等分析字段，点击按钮即可一键复制纯净号码</span>
        </span>
        <span className="text-slate-400">
          格式示例: 04 06 11 14 19 26 + 15
        </span>
      </div>
    </div>
  );
};

