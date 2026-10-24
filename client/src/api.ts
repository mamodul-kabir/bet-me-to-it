import type { WalletData, MarketItem, Commitment, VaultPosition, Charity, ForestStats } from './types';

const API_BASE = '/api';

export async function fetchWallet(): Promise<WalletData> {
  const res = await fetch(`${API_BASE}/gateway/wallet`);
  if (!res.ok) throw new Error('Failed to load wallet');
  return await res.json();
}

export async function fetchMarkets(): Promise<MarketItem[]> {
  const res = await fetch(`${API_BASE}/gateway/markets`);
  if (!res.ok) throw new Error('Failed to load markets');
  const data = await res.json();
  return data.markets || [];
}

export async function fetchCommitments(): Promise<Commitment[]> {
  const res = await fetch(`${API_BASE}/challenges`);
  if (!res.ok) throw new Error('Failed to load commitments');
  const data = await res.json();
  return data.commitments || [];
}

export async function createCommitment(payload: any): Promise<Commitment> {
  const res = await fetch(`${API_BASE}/challenges/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create commitment');
  return data.commitment;
}

export async function verifyProof(
  challengeId: string,
  proofText?: string,
  imageBase64?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/challenges/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_id: challengeId,
      proof_text: proofText,
      image_base64: imageBase64,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Proof verification failed');
  return data;
}

export async function simulateExpire(challengeId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/challenges/${challengeId}/simulate-expire`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to simulate expiration');
  return data;
}

export async function settleFailure(
  challengeId: string,
  forcedOutcome?: 'charity' | 'stock_lock'
): Promise<any> {
  const res = await fetch(`${API_BASE}/challenges/settle-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_id: challengeId,
      forced_outcome: forcedOutcome,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to settle failure');
  return data;
}

export async function fetchVaults(): Promise<{
  locked: VaultPosition[];
  unlocked: VaultPosition[];
  total_locked_value: number;
}> {
  const res = await fetch(`${API_BASE}/vaults`);
  if (!res.ok) throw new Error('Failed to load vaults');
  return await res.json();
}

export async function fetchCharities(): Promise<Charity[]> {
  const res = await fetch(`${API_BASE}/charities`);
  if (!res.ok) throw new Error('Failed to load charities');
  const data = await res.json();
  return data.charities || [];
}

export async function fetchForest(): Promise<ForestStats> {
  const res = await fetch(`${API_BASE}/forest`);
  if (!res.ok) throw new Error('Failed to load forest');
  return await res.json();
}

export async function executeTrade(payload: {
  asset_id: string;
  asset_symbol: string;
  qty: string;
  side: 'buy' | 'sell';
}): Promise<any> {
  const res = await fetch(`${API_BASE}/gateway/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      qty_unit: 'quote',
      type: 'market',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Trade failed');
  return data;
}

export async function executeTransfer(payload: {
  to: string;
  qty: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/gateway/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: payload.to,
      qty: payload.qty,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Transfer failed');
  return data;
}

export async function fetchTransactions(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/gateway/transactions`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.transactions || [];
}
