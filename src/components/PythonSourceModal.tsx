import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, FileCode, Download, ExternalLink } from 'lucide-react';

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'main.py' | 'mars_engine.py' | 'requirements.txt'>('main.py');
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !fileContents[activeTab]) {
      fetchFileContent(activeTab);
    }
  }, [isOpen, activeTab]);

  const fetchFileContent = async (filename: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/python-code/${filename}`);
      if (res.ok) {
        const text = await res.text();
        setFileContents((prev) => ({ ...prev, [filename]: text }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentContent = fileContents[activeTab] || '// 正在加载源码...';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Python FastAPI 后端源码与量化独立模块
              </h3>
              <p className="text-xs text-slate-500">
                可复制或下载至本地终端执行: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">python main.py</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 bg-white text-xs">
          <div className="flex items-center gap-2">
            {(['main.py', 'mars_engine.py', 'requirements.txt'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{tab}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-300 active:scale-95 cursor-pointer font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制到剪贴板' : '一键复制'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 cursor-pointer font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载文件</span>
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs text-slate-200 select-text leading-relaxed">
          {loading ? (
            <div className="py-12 text-center text-slate-400">正在获取文件源码...</div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto text-[11px] font-mono text-slate-200 selection:bg-blue-500/30">
              {currentContent}
            </pre>
          )}
        </div>

        {/* Instructions Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            本地运行提示: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">pip install -r requirements.txt && python main.py</code>
          </span>
          <span className="text-slate-500 text-xs">
            API 交互文档: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">http://localhost:8000/docs</code>
          </span>
        </div>
      </div>
    </div>
  );
};
