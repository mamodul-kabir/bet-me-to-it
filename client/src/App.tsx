import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StakesTab } from './components/StakesTab';
import { VaultsTab } from './components/VaultsTab';
import { TradeTab } from './components/TradeTab';
import { PaymentsTab } from './components/PaymentsTab';
import { NewBetModal } from './components/NewBetModal';
import { ProofModal } from './components/ProofModal';
import { RouletteModal } from './components/RouletteModal';

import {
  fetchWallet,
  fetchMarkets,
  fetchCommitments,
  fetchVaults,
  fetchCharities,
  fetchForest,
  createCommitment,
  verifyProof,
  simulateExpire,
  settleFailure,
} from './api';

import type {
  WalletData,
  MarketItem,
  Commitment,
  VaultPosition,
  Charity,
  ForestStats,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('stakes');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [vaults, setVaults] = useState<{
    locked: VaultPosition[];
    unlocked: VaultPosition[];
    total_locked_value: number;
  } | null>(null);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [forest, setForest] = useState<ForestStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [tradeSymbol, setTradeSymbol] = useState<string>('NVDA');

  // Modal states
  const [isNewBetModalOpen, setIsNewBetModalOpen] = useState(false);
  const [proofCommitment, setProofCommitment] = useState<Commitment | null>(null);
  const [rouletteCommitment, setRouletteCommitment] = useState<Commitment | null>(null);

  // Load all data
  const loadAllData = useCallback(async () => {
    try {
      const [
        walletRes,
        marketsRes,
        commitmentsRes,
        vaultsRes,
        charitiesRes,
        forestRes,
      ] = await Promise.all([
        fetchWallet().catch(() => null),
        fetchMarkets().catch(() => []),
        fetchCommitments().catch(() => []),
        fetchVaults().catch(() => ({ locked: [], unlocked: [], total_locked_value: 0 })),
        fetchCharities().catch(() => []),
        fetchForest().catch(() => null),
      ]);

      if (walletRes) setWallet(walletRes);
      if (marketsRes) setMarkets(marketsRes);
      if (commitmentsRes) setCommitments(commitmentsRes);
      if (vaultsRes) setVaults(vaultsRes);
      if (charitiesRes) setCharities(charitiesRes);
      if (forestRes) setForest(forestRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    // Poll updates every 20 seconds
    const interval = setInterval(loadAllData, 20000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Handle New Task Creation
  const handleCreateCommitment = async (payload: any) => {
    await createCommitment(payload);
    await loadAllData();
  };

  // Handle Proof Verification
  const handleVerifyProof = async (
    challengeId: string,
    proofText?: string,
    imageBase64?: string
  ) => {
    const verdict = await verifyProof(challengeId, proofText, imageBase64);
    await loadAllData();
    return verdict;
  };

  // Handle Simulate Deadline Expired (Judge Demo)
  const handleSimulateExpire = async (challengeId: string) => {
    const res = await simulateExpire(challengeId);
    await loadAllData();
    // Automatically open roulette modal for the expired challenge
    const target = commitments.find((c) => c.id === challengeId) || res.commitment;
    if (target) {
      setRouletteCommitment({ ...target, status: 'expired' });
    }
  };

  // Handle Consequence Roulette Settlement
  const handleSettleFailure = async (
    challengeId: string,
    forcedOutcome?: 'charity' | 'stock_lock'
  ) => {
    const res = await settleFailure(challengeId, forcedOutcome);
    await loadAllData();
    return res;
  };

  const handleNavigateToTrade = (symbol?: string) => {
    if (symbol) setTradeSymbol(symbol);
    setActiveTab('trade');
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sticky Top Header */}
      <Header
        wallet={wallet}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={loadAllData}
        forestXp={forest?.total_xp || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="text-sm font-mono text-slate-400">Connecting to True Markets Gateway...</div>
          </div>
        ) : (
          <>
            {activeTab === 'stakes' && (
              <StakesTab
                commitments={commitments}
                forest={forest}
                onOpenNewBet={() => setIsNewBetModalOpen(true)}
                onOpenProofModal={(c) => setProofCommitment(c)}
                onOpenRouletteModal={(c) => setRouletteCommitment(c)}
                onSimulateExpire={handleSimulateExpire}
                loading={loading}
              />
            )}

            {activeTab === 'vaults' && (
              <VaultsTab
                vaults={vaults}
                onNavigateToTrade={handleNavigateToTrade}
                loading={loading}
              />
            )}

            {activeTab === 'trade' && (
              <TradeTab
                markets={markets}
                wallet={wallet}
                vaults={vaults}
                onTradeSuccess={loadAllData}
                initialSymbol={tradeSymbol}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsTab
                wallet={wallet}
                charities={charities}
                onTransferSuccess={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a2233] bg-[#080b12] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">bet-me-to-it</span>
            <span>•</span>
            <span>Behavioral Fintech on True Markets Gateway</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Turnkey ECDSA P-256 Signatures</span>
            <span>•</span>
            <span>Gemini 2.5 Flash Oracle</span>
            <span>•</span>
            <span className="text-emerald-400">NYU Shipyard Fintech Track</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewBetModal
        isOpen={isNewBetModalOpen}
        onClose={() => setIsNewBetModalOpen(false)}
        onSubmit={handleCreateCommitment}
        charities={charities}
        markets={markets}
        userBalance={wallet?.pyusd_balance || 0}
      />

      <ProofModal
        commitment={proofCommitment}
        isOpen={!!proofCommitment}
        onClose={() => setProofCommitment(null)}
        onVerify={handleVerifyProof}
      />

      <RouletteModal
        commitment={rouletteCommitment}
        isOpen={!!rouletteCommitment}
        onClose={() => setRouletteCommitment(null)}
        onSettle={handleSettleFailure}
      />
    </div>
  );
};
