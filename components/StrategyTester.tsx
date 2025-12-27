
import React, { useState, useEffect } from 'react';
import { testStrategy } from '../services/n8nService.ts';
import { UserProfile, StrategyResult, HistoryItem, TradingStats } from '../types.ts';
import TradingChart from './TradingChart.tsx';

interface StrategyTesterProps {
  user: UserProfile;
  webhookUrl: string;
}

const STRATEGY_TEMPLATES = [
  {
    name: 'Mean Reversion',
    description: 'Bounces off oversold/overbought levels using RSI and Bollinger Bands.',
    logic: 'Execute LONG when RSI(14) drops below 30 and price touches the lower Bollinger Band on the 15m timeframe. Exit at the middle band.'
  },
  {
    name: 'Golden Cross',
    description: 'Classic trend-following strategy using long-term moving average crossovers.',
    logic: 'Identify a "Golden Cross" on the Daily timeframe where the 50-day EMA crosses above the 200-day EMA. Signal LONG with a trailing stop.'
  },
  {
    name: 'Range Breakout',
    description: 'Capitalizes on volatility spikes after periods of consolidation.',
    logic: 'Detect a breakout above the previous 24-hour high on the 1-hour chart. Volume must be at least 20% above the 20-period average.'
  },
  {
    name: 'M5 Scalp',
    description: 'High-frequency setup targeting small gains on the 5-minute timeframe.',
    logic: 'On the 5m chart, execute SHORT when price rejects the VWAP and the MACD histogram turns negative. Target 0.5% profit with a tight stop.'
  },
  {
    name: 'Trend Strength',
    description: 'Utilizes ADX and Supertrend to ride strong momentum waves.',
    logic: 'Execute LONG when the Supertrend (10, 3) indicator turns green and the ADX(14) is above 25, confirming trend strength. Exit on Supertrend flip.'
  }
];

const StrategyTester: React.FC<StrategyTesterProps> = ({ user, webhookUrl }) => {
  const [strategyName, setStrategyName] = useState(() => localStorage.getItem(`draft_name_${user.id}`) || '');
  const [strategyInput, setStrategyInput] = useState(() => localStorage.getItem(`draft_input_${user.id}`) || '');
  
  const [backtestParams, setBacktestParams] = useState(() => {
    const savedParams = localStorage.getItem(`draft_params_${user.id}`);
    return savedParams ? JSON.parse(savedParams) : {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      initialCapital: 10000,
      riskPerTrade: 1
    };
  });
  
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<StrategyResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem(`history_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(`draft_name_${user.id}`, strategyName);
    localStorage.setItem(`draft_input_${user.id}`, strategyInput);
    localStorage.setItem(`draft_params_${user.id}`, JSON.stringify(backtestParams));
    
    if (strategyName || strategyInput) {
      setIsDraftSaved(true);
      const timer = setTimeout(() => setIsDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [strategyName, strategyInput, backtestParams, user.id]);

  useEffect(() => {
    localStorage.setItem(`history_${user.id}`, JSON.stringify(history));
  }, [history, user.id]);

  const selectTemplate = (template: typeof STRATEGY_TEMPLATES[0]) => {
    setStrategyName(template.name);
    setStrategyInput(template.logic);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    if (window.confirm('Delete all backtest history? This action is permanent.')) {
      setHistory([]);
      localStorage.removeItem(`history_${user.id}`);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setStrategyName(item.name || '');
    setStrategyInput(item.input);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setStrategyInput('');
    setStrategyName('');
    setBacktestParams({
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      initialCapital: 10000,
      riskPerTrade: 1
    });
    localStorage.removeItem(`draft_name_${user.id}`);
    localStorage.removeItem(`draft_input_${user.id}`);
    localStorage.removeItem(`draft_params_${user.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyInput.trim() || !webhookUrl) return;

    setIsLoading(true);
    setError(null);
    try {
      const finalName = strategyName.trim() || 'Untitled Strategy';
      const response = await testStrategy(webhookUrl, user.id, strategyInput, finalName, backtestParams);
      
      const resultStats: TradingStats = response.stats || {
        trades: response.trades || 0,
        wins: response.wins || 0,
        losses: response.losses || 0,
        winRate: response.winRate || (response.trades > 0 ? (response.wins / response.trades) * 100 : 0)
      };

      const enrichedResponse = { ...response, stats: resultStats };
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        name: finalName,
        input: strategyInput,
        result: enrichedResponse,
        timestamp: new Date().toISOString()
      };

      setCurrentResult(enrichedResponse);
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to reach AI agent.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateParam = (key: string, value: any) => {
    setBacktestParams((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-white tracking-tight">Market Intelligence</h2>
          </div>
        </div>
        <TradingChart symbol="BTCUSDT" />
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-white tracking-tight">Strategy Entry</h2>
          </div>
          {isDraftSaved && (
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
              Draft Auto-Saved
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest ml-1">Templates</label>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => selectTemplate(template)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-blue-600/50 hover:bg-slate-800/50 text-slate-400 hover:text-blue-400 rounded-lg text-[11px] font-medium transition-all"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest ml-1">Strategy Name</label>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="e.g. BTC Reversal Strategy"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-blue-500/50 outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest ml-1">Logic Definition</label>
              <textarea
                value={strategyInput}
                onChange={(e) => setStrategyInput(e.target.value)}
                placeholder="Define your entry, exit, and risk parameters..."
                className="w-full h-40 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-200 focus:border-blue-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
              />
            </div>
            
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/30">
              <button
                type="button"
                onClick={() => setIsParamsOpen(!isParamsOpen)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
              >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Backtest Parameters</span>
                <span className={`transition-transform ${isParamsOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {isParamsOpen && (
                <div className="p-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Start Date</label>
                      <input type="date" value={backtestParams.startDate} onChange={(e) => updateParam('startDate', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest">End Date</label>
                      <input type="date" value={backtestParams.endDate} onChange={(e) => updateParam('endDate', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Initial Capital ($)</label>
                      <input type="number" value={backtestParams.initialCapital} onChange={(e) => updateParam('initialCapital', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Risk Per Trade (%)</label>
                      <input type="number" step="0.1" value={backtestParams.riskPerTrade} onChange={(e) => updateParam('riskPerTrade', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 text-xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleReset} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest">Reset Form</button>
            <button
              type="submit"
              disabled={isLoading || !strategyInput.trim()}
              className="px-10 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all flex items-center gap-3 text-sm shadow-xl"
            >
              {isLoading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        </form>
      </section>

      {currentResult && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 border-l-4 border-l-blue-600 animate-in fade-in slide-in-from-bottom-2">
           <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Latest Agent Transmission</h3>
           <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{currentResult.text || currentResult.reasoning || "Analysis complete."}</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-500 text-xs">{error}</div>}

      <section className="space-y-6 pt-12 border-t border-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategy History</h3>
          <div className="flex items-center gap-4">
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-[10px] font-bold text-slate-700 hover:text-rose-500 uppercase tracking-widest">Clear All</button>
            )}
            <span className="text-[10px] font-medium text-slate-600 px-2 py-1 bg-slate-900 rounded-md border border-slate-800">{history.length} Logs</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-slate-950 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-900/50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{item.name}</p>
                    <button onClick={() => loadFromHistory(item)} className="text-slate-600 hover:text-blue-500 text-[10px]">Load</button>
                    <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-600 hover:text-rose-500 text-[10px]">Delete</button>
                  </div>
                  <p className="text-[10px] text-slate-600">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-center"><p className="text-[9px] text-slate-600 uppercase font-black">Win Rate</p><p className="text-xs font-mono text-emerald-500 font-bold">{item.result.stats?.winRate?.toFixed(1)}%</p></div>
                   <div className="text-center"><p className="text-[9px] text-slate-600 uppercase font-black">Trades</p><p className="text-xs font-mono text-slate-300">{item.result.stats?.trades}</p></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-mono line-clamp-2 italic">"{item.result.text || item.result.reasoning}"</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StrategyTester;
