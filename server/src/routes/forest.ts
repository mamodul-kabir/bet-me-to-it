import { Router } from 'express';
import { getForest } from '../services/forest.js';

export const forestRouter = Router();

/**
 * GET /api/forest
 * Return all planted wealth trees and XP tier stats
 */
forestRouter.get('/', (_req, res) => {
  try {
    const data = getForest('admin');
    res.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('Error fetching forest:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch forest' });
  }
});

