import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import type { MarketItem, WalletData, VaultPosition } from '../types';
import { executeTrade } from '../api';

interface TradeTabProps {
  markets: MarketItem[];
  wallet: WalletData | null;
  vaults: { locked: VaultPosition[] } | null;
  onTradeSuccess: () => void;
  initialSymbol?: string;
}

export const TradeTab: React.FC<TradeTabProps> = ({
  markets,
  wallet,
  vaults,
  onTradeSuccess,
  initialSymbol = 'NVDA',
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amountPyusd, setAmountPyusd] = useState('10');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMarket = markets.find((m) => m.symbol === selectedSymbol) || markets[0];
  const userBalance = wallet?.pyusd_balance || 0;

  // Check if asset is locked in vault
  const lockedInVault = vaults?.locked.find(
    (v) => v.asset_symbol.toUpperCase() === selectedSymbol.toUpperCase()
  );

  // Fee calculation (20 bps = 0.20%)
  const numericAmount = parseFloat(amountPyusd) || 0;
  const feeRate = 0.002;
  const feeAmount = parseFloat((numericAmount * feeRate).toFixed(4));
  const grandTotal = side === 'buy' ? numericAmount + feeAmount : Math.max(numericAmount - feeAmount, 0);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMarket) return;
    setError(null);
    setReceipt(null);

    if (numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (side === 'buy' && grandTotal > userBalance) {
      setError(`Insufficient balance. You have $${userBalance.toFixed(2)} PYUSD.`);
      return;
    }

    setLoading(true);
    try {
      const result = await executeTrade({
        asset_id: currentMarket.id,
        asset_symbol: currentMarket.symbol,
        qty: amountPyusd,
        side,
      });
      setReceipt(result);
      onTradeSuccess();
    } catch (err: any) {
      setError(err.message || 'Trade execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rule 1 Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#101726] to-[#141d2e] border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">True Markets Trading Terminal</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                RULE 1 VERIFIED (20 BPS FEE)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Live tokenized stocks & crypto spot trading powered by True Markets Gateway with Turnkey P-256 signatures.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-[#232f48] text-xs font-mono text-emerald-400">
            Available: ${userBalance.toFixed(2)} PYUSD
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Market Selection & Market Snapshot */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Featured Tradable Assets
            </h3>
            <div className="space-y-1.5">
              {markets.map((m) => {
                const isSelected = m.symbol === selectedSymbol;
                const isPositive = m.change_24h >= 0;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedSymbol(m.symbol);
                      setError(null);
                      setReceipt(null);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                        : 'bg-[#0c101a] border-[#1b253b] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          m.asset_class === 'stock'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {m.symbol.slice(0, 3)}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{m.symbol}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {m.asset_class}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{m.name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-white">
                        ${m.price > 0 ? m.price.toFixed(2) : '--'}
                      </div>
                      <div
                        className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>{m.change_24h > 0 ? `+${m.change_24h}%` : `${m.change_24h}%`}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Columns: Active Market Order Terminal */}
        <div className="lg:col-span-2 space-y-4">
          {currentMarket && (
            <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-6 space-y-5 shadow-xl">
              {/* Market Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2a3e] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center font-black text-base text-cyan-300">
                    {currentMarket.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-white">{currentMarket.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                        {currentMarket.venue}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Tokenized Asset</span>
                      <span>•</span>
                      <span>Decimals: {currentMarket.decimals}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-2xl font-black text-white font-mono">
                    ${currentMarket.price.toFixed(2)} PYUSD
                  </div>
                  <div
                    className={`text-xs font-mono font-semibold flex items-center sm:justify-end gap-1 mt-0.5 ${
                      currentMarket.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    <span>24h Change:</span>
                    <span>{currentMarket.change_24h >= 0 ? `+${currentMarket.change_24h}%` : `${currentMarket.change_24h}%`}</span>
                  </div>
                </div>
              </div>

              {/* Vault Warning if Sell is selected and asset is locked */}
              {side === 'sell' && lockedInVault && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Position Locked in Vault!</span>
                    <p className="text-[11px] text-rose-300/90 mt-0.5">
                      You have {lockedInVault.qty.toFixed(4)} shares of {currentMarket.symbol} locked until{' '}
                      {new Date(lockedInVault.lock_until).toLocaleDateString()} ({lockedInVault.days_remaining} days left).
                      Selling will be rejected by True Markets Gateway with HTTP 403 Forbidden.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Order Form */}
              <form onSubmit={handleTrade} className="space-y-4">
                {/* Buy / Sell Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0c101a] border border-[#1b253b]">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`py-2 rounded-lg font-bold text-xs transition-all ${
                      side === 'buy'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    BUY {currentMarket.symbol}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`py-2 rounded-lg font-bold text-xs transition-all ${
                      side === 'sell'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SELL {currentMarket.symbol}
                  </button>
                </div>

                {/* Amount Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-slate-300 font-semibold">Order Quantity (in PYUSD)</label>
                    <span className="text-xs text-slate-400 font-mono">
                      Balance: ${userBalance.toFixed(2)} PYUSD
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={amountPyusd}
                      onChange={(e) => setAmountPyusd(e.target.value)}
                      placeholder="10.00"
                      className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-sm text-white font-mono"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      PYUSD
                    </span>
                  </div>

                  {/* Quick-fill Pills */}
                  <div className="flex gap-2 mt-2">
                    {['5', '10', '25', '50'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountPyusd(amt)}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#162033] hover:bg-[#1d2b45] text-slate-300 border border-[#24334f] transition-all"
                      >
                        ${amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountPyusd(userBalance.toFixed(2))}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#162033] hover:bg-[#1d2b45] text-emerald-400 border border-[#24334f] transition-all"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Dynamic Fee Breakdown Box (Rule 1 Accounting) */}
                <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-[#1d263b] space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Order Subtotal:</span>
                    <span className="text-white">${numericAmount.toFixed(2)} PYUSD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <span>True Markets Platform Fee:</span>
                      <span className="text-emerald-400 font-bold">(20 bps / 0.20%)</span>
                    </span>
                    <span className="text-emerald-400">+${feeAmount.toFixed(4)} PYUSD</span>
                  </div>
                  <div className="border-t border-[#1d263b] pt-1.5 flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Total Settlement Cost:</span>
                    <span className="text-emerald-400">${grandTotal.toFixed(2)} PYUSD</span>
                  </div>
                </div>

                {/* Submit Trade Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                    side === 'buy'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  {loading ? (
                    <span className="animate-spin">⏳ Executing on Gateway...</span>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>
                        Execute {side.toUpperCase()} (${numericAmount.toFixed(2)} {currentMarket.symbol})
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Execution Receipt Display */}
              {receipt && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>TRADE EXECUTED ON TRUE MARKETS GATEWAY</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                    <div>
                      Order ID:{' '}
                      <span className="text-white">
                        {receipt.order?.id || receipt.order?.order_id || 'ord-confirmed'}
                      </span>
                    </div>
                    <div>
                      Fee Charged: <span className="text-emerald-400">${receipt.fee_breakdown?.fee_amount} PYUSD</span>
                    </div>
                    <div>
                      Status: <span className="text-emerald-400 font-bold uppercase">{receipt.order?.status || 'FILLED'}</span>
                    </div>
                    <div>
                      Total Settled: <span className="text-white">${receipt.fee_breakdown?.grand_total} PYUSD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
