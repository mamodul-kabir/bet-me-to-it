import crypto from 'node:crypto';
import { getDb } from '../db/connection.js';

export interface ForestTree {
  id: string;
  user_id: string;
  commitment_id: string;
  ticker_symbol: string;
  tree_type: string;
  xp_earned: number;
  planted_at: string;
}

export function getTreeTypeForXp(xp: number): string {
  if (xp >= 300) return 'sequoia';
  if (xp >= 100) return 'sakura';
  if (xp >= 30) return 'pine';
  return 'oak';
}

export function getXpTier(xp: number): { tier: string; level: number; nextTierXp: number } {
  if (xp >= 300) return { tier: 'Ancient Forest', level: 4, nextTierXp: 500 };
  if (xp >= 100) return { tier: 'Thriving Grove', level: 3, nextTierXp: 300 };
  if (xp >= 30) return { tier: 'Growing Sapling', level: 2, nextTierXp: 100 };
  return { tier: 'Sprouting Seedling', level: 1, nextTierXp: 30 };
}

/**
 * Plant a new wealth tree in the user's forest upon verified task completion.
 * Increments user forest XP and assigns tree tier based on total XP.
 */
export function plantTree(
  userId: string = 'admin',
  commitmentId: string,
  tickerSymbol: string = 'NVDA'
): { tree: ForestTree; totalXp: number; tierInfo: ReturnType<typeof getXpTier> } {
  const db = getDb();

  // Check if tree already exists for this commitment
  const existing = db.prepare('SELECT * FROM forest_trees WHERE commitment_id = ?').get(commitmentId) as any;
  if (existing) {
    const userRow = db.prepare('SELECT forest_xp FROM users WHERE id = ?').get(userId) as any;
    const currentXp = userRow ? userRow.forest_xp : 0;
    return {
      tree: existing,
      totalXp: currentXp,
      tierInfo: getXpTier(currentXp),
    };
  }

  // Get current user XP
  const userRow = db.prepare('SELECT forest_xp FROM users WHERE id = ?').get(userId) as any;
  const currentXp = userRow ? userRow.forest_xp : 0;
  const newXp = currentXp + 10;
  const treeType = getTreeTypeForXp(newXp);

  const treeId = crypto.randomUUID();
  const plantedAt = new Date().toISOString();

  // Insert tree
  db.prepare(`
    INSERT INTO forest_trees (id, user_id, commitment_id, ticker_symbol, tree_type, xp_earned, planted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(treeId, userId, commitmentId, tickerSymbol, treeType, 10, plantedAt);

  // Update user XP
  db.prepare('UPDATE users SET forest_xp = ? WHERE id = ?').run(newXp, userId);

  const tree: ForestTree = {
    id: treeId,
    user_id: userId,
    commitment_id: commitmentId,
    ticker_symbol: tickerSymbol,
    tree_type: treeType,
    xp_earned: 10,
    planted_at: plantedAt,
  };

  return {
    tree,
    totalXp: newXp,
    tierInfo: getXpTier(newXp),
  };
}

/**
 * Fetch all planted trees and XP stats for a user
 */
export function getForest(userId: string = 'admin'): {
  trees: ForestTree[];
  total_xp: number;
  xp_tier: string;
  level: number;
  next_tier_xp: number;
} {
  const db = getDb();
  const trees = db.prepare('SELECT * FROM forest_trees WHERE user_id = ? ORDER BY planted_at DESC').all(userId) as ForestTree[];
  const userRow = db.prepare('SELECT forest_xp FROM users WHERE id = ?').get(userId) as any;
  const totalXp = userRow ? userRow.forest_xp : 0;
  const tierInfo = getXpTier(totalXp);

  return {
    trees,
    total_xp: totalXp,
    xp_tier: tierInfo.tier,
    level: tierInfo.level,
    next_tier_xp: tierInfo.nextTierXp,
  };
}

