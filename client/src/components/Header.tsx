import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import type { WalletData } from '../types';

interface HeaderProps {
  wallet: WalletData | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  forestXp?: number;
}

export const Header: React.FC<HeaderProps> = ({
  wallet,
  activeTab,
  setActiveTab,
  onRefresh,
  forestXp = 0,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const solBalance = wallet?.balances?.find(b => b.symbol === 'SOL')?.available || '0';

  return (
    <header className="border-b border-[#1f2738] bg-[#0c101a]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Logo & Mainnet Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-xl text-black shadow-lg shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  bet-me-to-it
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  MAINNET LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                Powered by True Markets Gateway & Gemini 2.5 Flash Oracle
              </p>
            </div>
          </div>

          {/* Wallet Pills & Balances */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live PYUSD Balance */}
            <div className="bg-[#141b2a] border border-[#232f48] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs text-slate-400">Balance:</span>
              <span className="font-mono font-bold text-sm text-emerald-400">
                ${wallet?.pyusd_balance?.toFixed(2) || '0.00'} PYUSD
              </span>
            </div>

            {/* Live SOL Balance */}
            {parseFloat(solBalance) > 0 && (
              <div className="bg-[#141b2a] border border-[#232f48] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="text-xs text-slate-400">SOL:</span>
                <span className="font-mono font-semibold text-sm text-cyan-400">
                  {parseFloat(solBalance).toFixed(4)}
                </span>
              </div>
            )}

            {/* Forest XP */}
            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
              <span>🌲</span>
              <span>{forestXp} XP</span>
            </div>

            {/* Solana Address Pill */}
            {wallet?.solana_address && (
              <button
                onClick={() => copyToClipboard(wallet.solana_address!, 'sol')}
                className="bg-[#141b2a] hover:bg-[#1a2336] border border-[#232f48] hover:border-slate-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-slate-300 transition-all font-mono"
                title={wallet.solana_address}
              >
                <span className="text-slate-500">SOL:</span>
                <span>{wallet.solana_address.slice(0, 4)}...{wallet.solana_address.slice(-4)}</span>
                {copied === 'sol' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            )}

            {/* EVM Address Pill */}
            {wallet?.evm_address && (
              <button
                onClick={() => copyToClipboard(wallet.evm_address!, 'evm')}
                className="bg-[#141b2a] hover:bg-[#1a2336] border border-[#232f48] hover:border-slate-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-slate-300 transition-all font-mono"
                title={wallet.evm_address}
              >
                <span className="text-slate-500">EVM:</span>
                <span>{wallet.evm_address.slice(0, 4)}...{wallet.evm_address.slice(-4)}</span>
                {copied === 'evm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            )}

            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-[#141b2a] hover:bg-[#1e283d] text-slate-400 hover:text-white border border-[#232f48] transition-all"
              title="Refresh balances & markets"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation */}
        <div className="flex items-center gap-1 mt-3.5 border-t border-[#1a2233] pt-2 overflow-x-auto">
          {[
            { id: 'stakes', label: '🎯 Focus Stakes & Forest', icon: '🌲' },
            { id: 'vaults', label: '🔒 Time-Locked Vaults', icon: '🏦' },
            { id: 'trade', label: '📈 Trade Terminal', icon: '📊' },
            { id: 'payments', label: '💸 Payments & Charity Hub', icon: '🤝' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
