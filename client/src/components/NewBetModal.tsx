import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import type { Charity, MarketItem } from '../types';

interface NewBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  charities: Charity[];
  markets: MarketItem[];
  userBalance: number;
}

export const NewBetModal: React.FC<NewBetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  charities,
  markets,
  userBalance,
}) => {
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState('');
  const [stake, setStake] = useState(5);
  const [charityPct, setCharityPct] = useState(50);
  const [targetSymbol, setTargetSymbol] = useState('NVDA');
  const [lockMonths, setLockMonths] = useState(6);
  const [selectedCharity, setSelectedCharity] = useState(charities[0]?.id || 'charity-save-children');
  const [hoursUntilDeadline, setHoursUntilDeadline] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const stockPct = 100 - charityPct;
  const charityObj = charities.find(c => c.id === selectedCharity) || charities[0];
  const targetMarket = markets.find(m => m.symbol === targetSymbol) || markets[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    if (stake > userBalance) {
      setError(`Insufficient balance. You have $${userBalance.toFixed(2)} PYUSD.`);
      return;
    }

    setLoading(true);
    try {
      const deadlineDate = new Date(Date.now() + hoursUntilDeadline * 3600 * 1000).toISOString();
      await onSubmit({
        title,
        verification_criteria: criteria || `Complete ${title} before deadline`,
        stake_amount: stake,
        deadline: deadlineDate,
        charity_pct: charityPct,
        stock_pct: stockPct,
        target_asset_id: targetMarket?.id || '17d110fb-cc58-4959-b61c-9833ddf8f305',
        target_asset_symbol: targetSymbol,
        lock_duration_months: lockMonths,
        charity_wallet: charityObj?.wallet_address || 'Ff1nEWtJ98CZc8qGozcpHVf2VRAxveMGBJ1R8CMhouAt',
        charity_name: charityObj?.name || 'Save the Children',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create commitment');
    } finally {
      setLoading(false);
    }
  };

  const handleUsePreset = (presetTitle: string, presetCriteria: string) => {
    setTitle(presetTitle);
    setCriteria(presetCriteria);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#101624] border border-[#232f48] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f2a3e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              🎯
            </div>
            <div>
              <h3 className="font-bold text-white text-base">New High-Stakes Task Bet</h3>
              <p className="text-xs text-slate-400">Put real PYUSD on the line with AI Oracle verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick 1-Click Presets */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">⚡ Judge Demo 1-Click Presets:</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleUsePreset('Complete 2 LeetCode Mediums', 'Screenshot showing 2 accepted LeetCode Medium submissions today')}
                className="text-[11px] px-2.5 py-1 rounded bg-[#162033] hover:bg-[#1e2d47] border border-[#283754] text-slate-300 transition-all"
              >
                💻 LeetCode Prep
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('Finish Calc III Homework Chapter 14', 'PDF or photo showing complete Stokes Theorem derivation')}
                className="text-[11px] px-2.5 py-1 rounded bg-[#162033] hover:bg-[#1e2d47] border border-[#283754] text-slate-300 transition-all"
              >
                📐 Math Homework
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('Review PR & Push Unit Tests', 'GitHub commit URL or PR screenshot with all tests passing')}
                className="text-[11px] px-2.5 py-1 rounded bg-[#162033] hover:bg-[#1e2d47] border border-[#283754] text-slate-300 transition-all"
              >
                🚀 GitHub PR
              </button>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Complete 2 LeetCode Medium problems"
              className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-sm text-white"
              required
            />
          </div>

          {/* Verification Criteria */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              AI Oracle Verification Criteria
            </label>
            <textarea
              value={criteria}
              onChange={e => setCriteria(e.target.value)}
              rows={2}
              placeholder="Describe exact proof expected (e.g. screenshot of accepted status, terminal output, homework photo)"
              className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          {/* Stake Amount & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-300 font-semibold">Stake Amount</label>
                <span className="font-mono text-emerald-400 font-bold text-xs">${stake} PYUSD</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={stake}
                onChange={e => setStake(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                <span>$2 min</span>
                <span>$25 max</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Deadline Countdown</label>
              <select
                value={hoursUntilDeadline}
                onChange={e => setHoursUntilDeadline(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] text-xs text-white"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours (Recommended)</option>
                <option value="4">4 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </div>
          </div>

          {/* Consequence Roulette Split Slider */}
          <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d263b] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Failure Consequence Roulette</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {charityPct}% Charity / {stockPct}% Stock
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={charityPct}
              onChange={e => setCharityPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <div className="font-semibold">Charity Slash ({charityPct}%)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Instant mainnet transfer to charity partner</div>
              </div>
              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                <div className="font-semibold">Forced Stock Lock ({stockPct}%)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Forced buy into Time-Locked Vault</div>
              </div>
            </div>
          </div>

          {/* Target Stock & Lock Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Target Stock Penalty</label>
              <select
                value={targetSymbol}
                onChange={e => setTargetSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] text-xs text-white"
              >
                <option value="NVDA">NVDA (NVIDIA Corp)</option>
                <option value="TSLA">TSLA (Tesla Inc)</option>
                <option value="AAPL">AAPL (Apple Inc)</option>
                <option value="SOL">SOL (Solana)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Lock Duration</label>
              <select
                value={lockMonths}
                onChange={e => setLockMonths(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] text-xs text-white"
              >
                <option value="6">6 Months Lock</option>
                <option value="12">1 Year Lock</option>
                <option value="24">2 Years Lock</option>
              </select>
            </div>
          </div>

          {/* Charity Destination */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">Designated Charity Slash Partner</label>
            <select
              value={selectedCharity}
              onChange={e => setSelectedCharity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] text-xs text-white"
            >
              {charities.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.chain})
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 font-bold text-sm text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Stake ${stake} PYUSD & Commit Task</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
