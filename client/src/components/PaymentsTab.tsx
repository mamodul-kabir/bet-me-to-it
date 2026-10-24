import React, { useState, useEffect } from 'react';
import {
  Send,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { WalletData, Charity } from '../types';
import { executeTransfer, fetchTransactions } from '../api';

interface PaymentsTabProps {
  wallet: WalletData | null;
  charities: Charity[];
  onTransferSuccess: () => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  wallet,
  charities,
  onTransferSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [donatingCharityId, setDonatingCharityId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userBalance = wallet?.pyusd_balance || 0;

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions();
      setTransactions(data);
    } catch {
      // Ignored
    }
  };

  // Direct 1-Click Instant Donation Execution
  const handleInstantDonate = async (charity: Charity) => {
    setError(null);
    setReceipt(null);

    const donateAmount = 5;
    if (donateAmount > userBalance) {
      setError(`Insufficient balance. You have $${userBalance.toFixed(2)} PYUSD.`);
      return;
    }

    setDonatingCharityId(charity.id);
    try {
      const result = await executeTransfer({
        to: charity.wallet_address,
        qty: '5',
      });
      setReceipt({
        ...result,
        charityName: charity.name,
        explorerUrl:
          result.transfer?.explorer_url ||
          (result.transfer?.tx_hash
            ? `https://solscan.io/tx/${result.transfer.tx_hash}`
            : null),
      });
      setRecipient(charity.wallet_address);
      onTransferSuccess();
      loadTransactions();
    } catch (err: any) {
      setError(`Donation failed: ${err.message || 'Gateway transfer error'}`);
    } finally {
      setDonatingCharityId(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReceipt(null);

    const numericAmount = parseFloat(amount);
    if (!recipient.trim()) {
      setError('Please enter a destination wallet address');
      return;
    }

    if (isNaN(numericAmount) || numericAmount < 5) {
      setError('Minimum transfer size is 5 PYUSD on Solana Gateway');
      return;
    }

    if (numericAmount > userBalance) {
      setError(`Insufficient balance. You have $${userBalance.toFixed(2)} PYUSD.`);
      return;
    }

    setLoading(true);
    try {
      const result = await executeTransfer({
        to: recipient.trim(),
        qty: amount,
      });
      setReceipt({
        ...result,
        explorerUrl:
          result.transfer?.explorer_url ||
          (result.transfer?.tx_hash
            ? `https://solscan.io/tx/${result.transfer.tx_hash}`
            : null),
      });
      onTransferSuccess();
      loadTransactions();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCharitySelect = (charity: Charity) => {
    setRecipient(charity.wallet_address);
    setAmount('5');
    setError(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Rule 1 Money Transfer Header */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#101726] to-[#141d2e] border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">True Markets Payments & Transfer Terminal</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                RULE 1 TRANSFER
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Direct peer-to-peer and charity transfers executed live on True Markets Gateway with Turnkey payload stamps.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-[#232f48] text-xs font-mono text-emerald-400">
            Available: ${userBalance.toFixed(2)} PYUSD
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Global Success Banner */}
      {receipt && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-xs text-emerald-200 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>MAINNET TRANSFER CONFIRMED ON TRUE MARKETS GATEWAY!</span>
            </div>
            {receipt.explorerUrl && (
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1 transition-all"
              >
                <span>View on Solscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-200">
            Successfully transferred{' '}
            <span className="font-mono font-bold text-white">${receipt.amount} PYUSD</span> to{' '}
            {receipt.charityName ? (
              <span className="font-bold text-emerald-300">{receipt.charityName}</span>
            ) : null}{' '}
            (<span className="font-mono text-slate-400">{receipt.recipient}</span>).
          </p>
          <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-4 pt-1 border-t border-emerald-500/30">
            <span>
              Gateway ID:{' '}
              <span className="text-slate-300">
                {receipt.transfer?.id || receipt.transfer?.transfer_id || 'tx-executed'}
              </span>
            </span>
            {receipt.transfer?.tx_hash && (
              <span>
                TX Hash:{' '}
                <span className="text-slate-300">
                  {receipt.transfer.tx_hash.slice(0, 16)}...
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Money Form */}
        <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-[#1f2a3e] pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Send PYUSD Payment</h3>
              <p className="text-xs text-slate-400">Mainnet Solana or EVM wallet transfer</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Quick Fill Dropdown */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Quick Select Charity Partner:
              </label>
              <select
                onChange={(e) => {
                  const found = charities.find((c) => c.id === e.target.value);
                  if (found) handleCharitySelect(found);
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose verified charity or enter custom wallet below --</option>
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.chain})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Recipient Wallet Address (Solana or EVM)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Paste Solana or EVM public key address..."
                className="w-full px-3 py-2.5 rounded-xl bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-xs text-white font-mono"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-300 font-semibold">Amount (PYUSD)</label>
                <span className="text-[11px] text-slate-400 font-mono">Min 5 PYUSD limit</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                <input
                  type="number"
                  step="any"
                  min="5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5.00"
                  className="w-full pl-8 pr-16 py-2.5 rounded-xl bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-sm text-white font-mono"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  PYUSD
                </span>
              </div>

              {/* Quick Pills */}
              <div className="flex gap-2 mt-2">
                {['5', '10', '25', '50'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#162033] hover:bg-[#1d2b45] text-slate-300 border border-[#24334f] transition-all"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⏳ Executing Transfer on Gateway...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send ${amount} PYUSD Transfer</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verified Charity Partners Directory */}
        <div className="bg-[#101624] border border-[#232f48] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-[#1f2a3e] pb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Verified Charity Directory</h3>
              <p className="text-xs text-slate-400">Real on-chain consequence destinations</p>
            </div>
          </div>

          <div className="space-y-3">
            {charities.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#0c101a] border border-[#1b253b] hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{c.name}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold border border-emerald-500/20">
                      {c.chain} Mainnet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{c.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#161f30]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                    <span title={c.wallet_address}>
                      {c.wallet_address.slice(0, 10)}...{c.wallet_address.slice(-6)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(c.wallet_address, c.id)}
                      className="text-slate-500 hover:text-white"
                      title="Copy Address"
                    >
                      {copiedId === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCharitySelect(c)}
                      className="text-[11px] px-2 py-1 rounded bg-[#162033] hover:bg-[#1f2e4a] text-slate-300 border border-[#253552] transition-all"
                      title="Fill into transfer form"
                    >
                      Fill Form
                    </button>
                    <button
                      disabled={donatingCharityId === c.id}
                      onClick={() => handleInstantDonate(c)}
                      className="text-[11px] font-bold px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black shadow-md shadow-rose-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {donatingCharityId === c.id ? (
                        <span className="animate-spin">⏳ Sending $5...</span>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>⚡ Donate $5 Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction History & Audit Ledger */}
      <div className="bg-[#101624] border border-[#232f48] rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-[#1f2a3e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Gateway Transaction & Settlement Ledger</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions executed yet. Transfers and trades will appear here with on-chain IDs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] border-b border-[#1f2a3e] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Gateway ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2438]">
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#141b2a] transition-colors">
                    <td className="px-6 py-3.5 font-medium">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.tx_type === 'transfer'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {tx.tx_type} {tx.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">{tx.asset_symbol}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-200">
                      ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">
                      {tx.gateway_id ? `${tx.gateway_id.slice(0, 12)}...` : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-[10px] text-slate-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
