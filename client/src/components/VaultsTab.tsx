import React from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Code2,
} from 'lucide-react';
import type { VaultPosition } from '../types';

interface VaultsTabProps {
  vaults: {
    locked: VaultPosition[];
    unlocked: VaultPosition[];
    total_locked_value: number;
  } | null;
  onNavigateToTrade: (symbol?: string) => void;
  loading: boolean;
}

export const VaultsTab: React.FC<VaultsTabProps> = ({
  vaults,
  onNavigateToTrade,
  loading,
}) => {
  const lockedPositions = vaults?.locked || [];
  const unlockedPositions = vaults?.unlocked || [];
  const totalLockedValue = vaults?.total_locked_value || 0;

  // Find earliest unlock date
  const earliestUnlock = lockedPositions.reduce((earliest, p) => {
    const d = new Date(p.lock_until);
    return !earliest || d < earliest ? d : earliest;
  }, null as Date | null);

  const daysToEarliest = earliestUnlock
    ? Math.max(Math.ceil((earliestUnlock.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1)
    : null;

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Locked in Vaults</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            ${totalLockedValue.toFixed(2)} PYUSD
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {lockedPositions.length} position{lockedPositions.length === 1 ? '' : 's'} under enforced lock
          </div>
        </div>

        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Earliest Maturing Lock</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {daysToEarliest !== null ? `${daysToEarliest} Days` : 'None'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {earliestUnlock ? earliestUnlock.toLocaleDateString() : 'No active locks'}
          </div>
        </div>

        <div className="bg-[#101624] border border-[#232f48] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Liquid Unlocked Portfolio</span>
            <Unlock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {unlockedPositions.length} Position{unlockedPositions.length === 1 ? '' : 's'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Freely tradable on Gateway Terminal</div>
        </div>
      </div>

      {/* Behavioral Concept Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-[#101726] to-[#121a2c] border border-cyan-500/30 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm">
              Behavioral Commitment: Time-Locked Compounding
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              When a task deadline expires and the roulette rolls a Stock penalty, funds are not lost to the void.
              Instead, they are automatically converted into tokenized shares (e.g. <span className="text-cyan-300 font-mono font-bold">NVDA</span>, <span className="text-cyan-300 font-mono font-bold">TSLA</span>, <span className="text-cyan-300 font-mono font-bold">AAPL</span>) via True Markets Gateway and locked.
              Our API strictly enforces sell locks by rejecting any sell orders with <code className="bg-black/50 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-[11px]">HTTP 403 Forbidden</code> until the unlock date.
            </p>
          </div>
        </div>
      </div>

      {/* Time-Locked Positions Table */}
      <div className="bg-[#101624] border border-[#232f48] rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-[#1f2a3e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Active Time-Locked Vault Positions</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
              {lockedPositions.length} LOCKED
            </span>
          </div>
          <span className="text-xs text-slate-400">Strictly Enforced by API</span>
        </div>

        {lockedPositions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No positions are currently locked. If you fail a task and roll a stock penalty, shares will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] border-b border-[#1f2a3e] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Asset</th>
                  <th className="px-4 py-3">Shares</th>
                  <th className="px-4 py-3">Total Invested</th>
                  <th className="px-4 py-3">Unlock Date</th>
                  <th className="px-6 py-3">Lock Progress</th>
                  <th className="px-6 py-3 text-right">Status / Enforcement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2438]">
                {lockedPositions.map((p) => {
                  const progress = p.progress_pct || 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#141b2a] transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400">
                            {p.asset_symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm">{p.asset_symbol}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Vault ID: {p.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-mono font-bold text-slate-200">
                        {p.qty.toFixed(4)}
                      </td>

                      <td className="px-4 py-4 font-mono font-bold text-emerald-400">
                        ${p.purchase_total?.toFixed(2) || '0.00'} PYUSD
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-white font-medium">
                          {p.lock_until ? new Date(p.lock_until).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-[10px] text-amber-400 font-semibold">
                          {p.days_remaining} days remaining
                        </div>
                      </td>

                      <td className="px-6 py-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>Locked</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-500 border border-slate-700/60 font-semibold text-[11px] cursor-not-allowed inline-flex items-center gap-1.5 shadow-none"
                          title={`Locked until ${p.lock_until}. Sell order strictly rejected by Gateway.`}
                        >
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Sell Locked</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Liquid Unlocked Positions (if any) */}
      {unlockedPositions.length > 0 && (
        <div className="bg-[#101624] border border-[#232f48] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-[#1f2a3e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Liquid Unlocked Portfolio</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Freely Tradable</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] border-b border-[#1f2a3e] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Asset</th>
                  <th className="px-4 py-3">Shares</th>
                  <th className="px-4 py-3">Total Invested</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2438]">
                {unlockedPositions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#141b2a] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      <span className="font-bold">{p.asset_symbol}</span>
                    </td>
                    <td className="px-4 py-4 font-mono">{p.qty.toFixed(4)}</td>
                    <td className="px-4 py-4 font-mono text-emerald-400">
                      ${p.purchase_total?.toFixed(2)} PYUSD
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigateToTrade(p.asset_symbol)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs inline-flex items-center gap-1 transition-all"
                      >
                        <span>Trade</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Technical Enforcement Architecture Box */}
      <div className="bg-[#0a0d14] border border-[#1b2438] rounded-xl p-4 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">Enforcement Verification (server/src/routes/gateway.ts)</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            HTTP 403 GUARD ACTIVE
          </span>
        </div>
        <pre className="p-3 rounded-lg bg-[#07090e] border border-slate-800 text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`if (side === 'sell') {
  const lockedPos = checkSellLocked(asset_symbol || asset_id, 'admin');
  if (lockedPos) {
    return res.status(403).json({
      error: \`Cannot sell \${asset_symbol}: Position is locked until \${lockedPos.lock_until} (\${lockedPos.days_remaining} days remaining)\`,
      locked_position: lockedPos,
    });
  }
}`}
        </pre>
      </div>
    </div>
  );
};
