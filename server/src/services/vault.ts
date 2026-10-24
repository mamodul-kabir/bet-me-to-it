import { getDb } from '../db/connection.js';

export interface VaultPosition {
  id: string;
  user_id: string;
  commitment_id: string | null;
  asset_id: string;
  asset_symbol: string;
  qty: number;
  purchase_price: number;
  purchase_total: number;
  gateway_order_id: string;
  lock_until: string;
  is_unlocked: number;
  created_at: string;
  is_locked?: boolean;
  progress_pct?: number;
  days_remaining?: number;
}

/**
 * Check if an asset has active time-locked positions
 */
export function checkSellLocked(assetIdOrSymbol: string, userId: string = 'admin'): VaultPosition | null {
  const db = getDb();
  unlockExpiredPositions();

  const pos = db.prepare(`
    SELECT * FROM vault_positions 
    WHERE user_id = ? 
      AND (asset_id = ? OR UPPER(asset_symbol) = UPPER(?))
      AND is_unlocked = 0 
      AND datetime(lock_until) > datetime('now')
    ORDER BY datetime(lock_until) DESC
    LIMIT 1
  `).get(userId, assetIdOrSymbol, assetIdOrSymbol) as VaultPosition | undefined;

  if (!pos) return null;

  const now = Date.now();
  const lockUntilTime = new Date(pos.lock_until).getTime();
  const daysRemaining = Math.max(Math.ceil((lockUntilTime - now) / (1000 * 60 * 60 * 24)), 1);

  return {
    ...pos,
    is_locked: true,
    days_remaining: daysRemaining,
  };
}

/**
 * Automatically update positions whose lock_until timestamp has passed
 */
export function unlockExpiredPositions(): number {
  const db = getDb();
  const res = db.prepare(`
    UPDATE vault_positions 
    SET is_unlocked = 1 
    WHERE is_unlocked = 0 AND datetime(lock_until) <= datetime('now')
  `).run();
  return res.changes;
}

/**
 * Get all vault positions for a user with lock progress calculation
 */
export function getVaultPositions(userId: string = 'admin'): {
  locked: VaultPosition[];
  unlocked: VaultPosition[];
  total_locked_value: number;
  count: number;
} {
  const db = getDb();
  unlockExpiredPositions();

  const rows = db.prepare(`
    SELECT * FROM vault_positions 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(userId) as VaultPosition[];

  const now = Date.now();
  const locked: VaultPosition[] = [];
  const unlocked: VaultPosition[] = [];
  let totalLockedValue = 0;

  for (const r of rows) {
    const createdTime = new Date(r.created_at).getTime();
    const lockUntilTime = new Date(r.lock_until).getTime();
    const totalDuration = Math.max(lockUntilTime - createdTime, 1);
    const elapsed = Math.max(now - createdTime, 0);

    const isLocked = r.is_unlocked === 0 && lockUntilTime > now;
    const progressPct = isLocked
      ? Math.min(Math.round((elapsed / totalDuration) * 100), 99)
      : 100;
    const daysRemaining = isLocked
      ? Math.max(Math.ceil((lockUntilTime - now) / (1000 * 60 * 60 * 24)), 1)
      : 0;

    const enriched: VaultPosition = {
      ...r,
      is_locked: isLocked,
      progress_pct: progressPct,
      days_remaining: daysRemaining,
    };

    if (isLocked) {
      locked.push(enriched);
      totalLockedValue += r.purchase_total;
    } else {
      unlocked.push(enriched);
    }
  }

  return {
    locked,
    unlocked,
    total_locked_value: parseFloat(totalLockedValue.toFixed(2)),
    count: rows.length,
  };
}
