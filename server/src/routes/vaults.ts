import { Router } from 'express';
import { getVaultPositions } from '../services/vault.js';

export const vaultsRouter = Router();

/**
 * GET /api/vaults
 * Fetch time-locked vault positions and liquid unlocked positions
 */
vaultsRouter.get('/', (_req, res) => {
  try {
    const data = getVaultPositions('admin');
    res.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('Error fetching vault positions:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch vault positions' });
  }
});

