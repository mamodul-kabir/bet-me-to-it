export interface WalletData {
  success: boolean;
  solana_address: string | null;
  evm_address: string | null;
  pyusd_balance: number;
  balances: Array<{
    asset_id: string;
    symbol: string;
    name: string;
    chain: string;
    venue: string;
    total: string;
    available: string;
  }>;
}

export interface MarketItem {
  id: string;
  symbol: string;
  name: string;
  asset_class: 'stock' | 'crypto';
  venue: string;
  price: number;
  change_24h: number;
  decimals: number;
}

export interface OracleVerdict {
  verified: boolean;
  confidence: number;
  reasoning: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  title: string;
  verification_criteria: string;
  stake_amount: number;
  deadline: string;
  status: 'active' | 'verified' | 'failed' | 'expired';
  charity_pct: number;
  stock_pct: number;
  target_asset_id: string;
  target_asset_symbol: string;
  lock_duration_months: number;
  charity_wallet: string;
  charity_name: string;
  consequence_outcome: 'charity' | 'stock_lock' | null;
  resolved_at: string | null;
  created_at: string;
  latest_verdict?: OracleVerdict | null;
  has_tree?: boolean;
  has_vault?: boolean;
}

export interface VaultPosition {
  id: string;
  user_id: string;
  commitment_id: string | null;
  asset_id: string;
  asset_symbol: string;
  qty: number;
  purchase_price: number;
  purchase_total: number;
  lock_until: string;
  is_unlocked: number;
  created_at: string;
  is_locked?: boolean;
  progress_pct?: number;
  days_remaining?: number;
}

export interface Charity {
  id: string;
  name: string;
  wallet_address: string;
  chain: string;
  description: string;
  logo_url: string;
}

export interface ForestTree {
  id: string;
  commitment_id: string;
  ticker_symbol: string;
  tree_type: string;
  xp_earned: number;
  planted_at: string;
}

export interface ForestStats {
  trees: ForestTree[];
  total_xp: number;
  xp_tier: string;
  level: number;
  next_tier_xp: number;
}
