import { Router } from 'express';
import { getDb } from '../db/connection.js';

export const charitiesRouter = Router();

/**
 * GET /api/charities
 * List all pre-configured active verified charities
 */
charitiesRouter.get('/', (_req, res) => {
  try {
    const db = getDb();
    const charities = db.prepare('SELECT * FROM charity_wallets WHERE is_active = 1 ORDER BY name ASC').all();
    res.json({
      success: true,
      charities,
    });
  } catch (err: any) {
    console.error('Error fetching charities:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch charities' });
  }
});

