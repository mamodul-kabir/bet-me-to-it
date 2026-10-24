import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PlusCircle,
  HelpCircle,
  Trees,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { Commitment, ForestStats } from '../types';

interface StakesTabProps {
  commitments: Commitment[];
  forest: ForestStats | null;
  onOpenNewBet: () => void;
  onOpenProofModal: (commitment: Commitment) => void;
  onOpenRouletteModal: (commitment: Commitment) => void;
  onSimulateExpire: (commitmentId: string) => Promise<void>;
  loading: boolean;
}

export const StakesTab: React.FC<StakesTabProps> = ({
  commitments,
  forest,
  onOpenNewBet,
  onOpenProofModal,
  onOpenRouletteModal,
  onSimulateExpire,
  loading,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'verified' | 'failed'>('all');
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  // Computed metrics
  const activeTasks = commitments.filter((c) => c.status === 'active');
  const expiredTasks = commitments.filter((c) => c.status === 'expired');
  const verifiedTasks = commitments.filter((c) => c.status === 'verified');
  const failedTasks = commitments.filter((c) => c.status === 'failed');

  const totalActiveStake = activeTasks.reduce((sum, c) => sum + (c.stake_amount || 0), 0);
  const totalCompleted = verifiedTasks.length + failedTasks.length;
  const successRate = totalCompleted > 0 ? Math.round((verifiedTasks.length / totalCompleted) * 100) : 100;

  const filteredCommitments = commitments.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const handleSimulateExpireClick = async (id: string) => {
    setSimulatingId(id);
    try {
      await onSimulateExpire(id);
    } finally {
      setSimulatingId(null);
    }
  };

  // Helper for human-readable deadline
  const formatDeadline = (isoString: string) => {
    const deadline = new Date(isoString).getTime();
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) return 'Deadline Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  // Tree icon color helper based on ticker
  const getTreeColor = (ticker: string) => {
    switch (ticker.toUpperCase()) {
      case 'NVDA':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'TSLA':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'AAPL':
        return 'text-slate-300 bg-slate-500/10 border-slate-500/30';
      case 'SOL':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'BTC':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Metrics & CTA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Active PYUSD Staked</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            ${totalActiveStake.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{activeTasks.length} tasks in progress</div>
        </div>

        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Success Rate</div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {successRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {verifiedTasks.length} verified / {totalCompleted} resolved
          </div>
        </div>

        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Wealth Forest Level</div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1 flex items-center gap-1.5">
            <span>🌲</span>
            <span>Lvl {forest?.level || 1}</span>
          </div>
          <div className="text-[11px] text-amber-400/80 mt-0.5 font-medium">
            {forest?.xp_tier || 'Seedling'} ({forest?.total_xp || 0} XP)
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-950/40 via-[#101624] to-[#141d2f] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Behavioral Commitment</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Stake real PYUSD against your focus goals.
            </div>
          </div>
          <button
            onClick={onOpenNewBet}
            className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Commit New Bet</span>
          </button>
        </div>
      </div>

      {/* Judge Demo Quick Action Panel */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#111927] to-[#151f33] border border-amber-500/30 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 text-lg">👨‍⚖️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm">Judge Demo Quick Controls</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  STEP 5 DEMO MODE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Test the end-to-end loop: <span className="text-emerald-400 font-semibold">1. Verify proof with AI Oracle</span> (plants tree) or <span className="text-rose-400 font-semibold">2. Simulate Expired</span> to trigger the <span className="text-cyan-400 font-semibold">Consequence Roulette</span> live on screen.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeTasks[0] && (
              <>
                <button
                  onClick={() => onOpenProofModal(activeTasks[0])}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Test Gemini AI Oracle on first active task"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verify Top Task</span>
                </button>
                <button
                  onClick={() => handleSimulateExpireClick(activeTasks[0].id)}
                  disabled={simulatingId === activeTasks[0].id}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Immediately expire deadline to trigger Roulette"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{simulatingId === activeTasks[0].id ? 'Expiring...' : 'Simulate Expire Top Task'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#1f2a3e] pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Tasks', count: commitments.length },
            { id: 'active', label: 'Active', count: activeTasks.length, badgeColor: 'text-emerald-400' },
            { id: 'expired', label: 'Roulette Ready', count: expiredTasks.length, badgeColor: 'text-amber-400' },
            { id: 'verified', label: 'Verified', count: verifiedTasks.length, badgeColor: 'text-cyan-400' },
            { id: 'failed', label: 'Settled', count: failedTasks.length, badgeColor: 'text-slate-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filter === tab.id
                  ? 'bg-[#1b2538] text-white border border-[#2b3b59]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121927]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] font-mono font-bold ${tab.badgeColor || 'text-slate-400'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Commitments Cards Grid */}
      {filteredCommitments.length === 0 ? (
        <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-2xl">
            🎯
          </div>
          <h4 className="font-bold text-white text-base">No tasks match this filter</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Commit to a new task with real PYUSD on the line to test behavioral enforcement.
          </p>
          <button
            onClick={onOpenNewBet}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Task Bet</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommitments.map((c) => {
            const isExpired = c.status === 'expired';
            const isActive = c.status === 'active';
            const isVerified = c.status === 'verified';
            const isFailed = c.status === 'failed';

            return (
              <div
                key={c.id}
                className={`bg-[#101624] border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-lg ${
                  isExpired
                    ? 'border-amber-500/50 bg-gradient-to-b from-[#181a17] to-[#101624]'
                    : isActive
                    ? 'border-[#232f48] hover:border-emerald-500/40'
                    : isVerified
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Card Status Header */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        ACTIVE BET
                      </span>
                    )}
                    {isExpired && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        ROULETTE READY
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        VERIFIED BY AI
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                        ⚡ SETTLED PENALTY
                      </span>
                    )}

                    {/* Stake Pill */}
                    <div className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#090d16] text-emerald-400 border border-[#1b253b]">
                      ${c.stake_amount} PYUSD
                    </div>
                  </div>

                  {/* Task Title */}
                  <h4 className="font-bold text-white text-sm line-clamp-2">{c.title}</h4>

                  {/* Criteria */}
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 italic">
                    "{c.verification_criteria}"
                  </p>

                  {/* Roulette Consequence Breakdown */}
                  <div className="mt-3 p-2.5 rounded-lg bg-[#0c101a] border border-[#1b2438] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Consequence Roulette:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {c.charity_pct}% Charity / {c.stock_pct}% Stock
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Charity: <span className="text-slate-300">{c.charity_name}</span></span>
                      <span>Stock: <span className="text-cyan-300 font-bold">{c.target_asset_symbol}</span> ({c.lock_duration_months}m lock)</span>
                    </div>
                  </div>

                  {/* Deadline or Resolution Status */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {isActive
                        ? formatDeadline(c.deadline)
                        : isExpired
                        ? 'Deadline passed without verification'
                        : isVerified
                        ? `Resolved: ${c.resolved_at?.split('T')[0] || 'Success'}`
                        : `Settled via ${c.consequence_outcome === 'charity' ? 'Charity Slash' : 'Stock Lock'}`}
                    </span>
                  </div>

                  {/* Oracle Reasoning for Verified Tasks */}
                  {c.latest_verdict && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[10px] text-emerald-300">
                      <div className="font-bold flex items-center justify-between">
                        <span>AI Oracle Verdict:</span>
                        <span>{Math.round((c.latest_verdict.confidence || 0.9) * 100)}% match</span>
                      </div>
                      <p className="italic text-slate-300 mt-0.5 line-clamp-2">
                        "{c.latest_verdict.reasoning || 'Task completion confirmed.'}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-[#1b2438] space-y-2">
                  {isActive && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenProofModal(c)}
                        className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Submit Proof</span>
                      </button>
                      <button
                        onClick={() => handleSimulateExpireClick(c.id)}
                        disabled={simulatingId === c.id}
                        className="py-2 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
                        title="Simulate Deadline Expired (Judge Demo)"
                      >
                        {simulatingId === c.id ? '...' : '⚡ Expire'}
                      </button>
                    </div>
                  )}

                  {isExpired && (
                    <button
                      onClick={() => onOpenRouletteModal(c)}
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-black text-xs transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 animate-bounce"
                    >
                      <span>🎰 Spin Consequence Roulette</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isVerified && (
                    <div className="text-center py-1 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      <span>🌲 Tree Planted in Forest (+10 XP)</span>
                    </div>
                  )}

                  {isFailed && (
                    <div className="text-center py-1 text-xs text-slate-400 flex items-center justify-center gap-1">
                      {c.consequence_outcome === 'charity' ? (
                        <span className="text-rose-400 font-semibold">💸 Charity Slash Executed on Mainnet</span>
                      ) : (
                        <span className="text-cyan-400 font-semibold">🔒 Locked in Time-Vault ({c.target_asset_symbol})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wealth Forest & XP Progress Canvas */}
      <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1f2a3e] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl">
              🌲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Your Wealth Forest</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {forest?.trees?.length || 0} Trees Planted
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Every verified task plants a tree corresponding to your staked target asset.
              </p>
            </div>
          </div>

          {/* XP Tier Badge & Progress */}
          <div className="bg-[#0c101a] border border-[#1d263b] px-4 py-2 rounded-xl flex items-center gap-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Forest Tier</div>
              <div className="text-xs font-extrabold text-amber-300">
                {forest?.xp_tier || 'Seedling'} (Level {forest?.level || 1})
              </div>
            </div>
            <div className="w-24">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{forest?.total_xp || 0} XP</span>
                <span>{forest?.next_tier_xp || 100} XP</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.round(((forest?.total_xp || 0) / (forest?.next_tier_xp || 100)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Forest Trees Grid */}
        {(!forest?.trees || forest.trees.length === 0) ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No trees planted yet. Complete a task and get verified by the AI Oracle to grow your forest!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {forest.trees.map((tree) => {
              const colorClasses = getTreeColor(tree.ticker_symbol);
              return (
                <div
                  key={tree.id}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all hover:scale-105 ${colorClasses}`}
                >
                  <span className="text-3xl mb-1 filter drop-shadow">🌲</span>
                  <span className="font-extrabold text-xs tracking-tight">{tree.ticker_symbol} Tree</span>
                  <span className="text-[10px] opacity-75 mt-0.5">
                    {tree.planted_at?.split('T')[0] || 'Recently'}
                  </span>
                  <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/40 text-emerald-300">
                    +{tree.xp_earned} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
