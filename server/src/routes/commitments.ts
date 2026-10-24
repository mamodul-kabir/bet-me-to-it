import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { getDb } from '../db/connection.js';
import { verifyTaskProof } from '../services/oracle.js';
import { plantTree } from '../services/forest.js';
import { settleCommitmentFailure } from '../services/consequence.js';

export const commitmentsRouter = Router();

// Configure multer for memory storage of uploaded screenshot proof files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

/**
 * Check and mark overdue active commitments as expired
 */
export function checkExpiredCommitments(): number {
  try {
    const db = getDb();
    const result = db.prepare(`
      UPDATE commitments 
      SET status = 'expired' 
      WHERE status = 'active' AND datetime(deadline) < datetime('now')
    `).run();
    return result.changes;
  } catch (err) {
    console.error('Failed to update expired commitments:', err);
    return 0;
  }
}

/**
 * POST /create (or /api/commitments/create, /api/challenges/create)
 * Create a new high-stakes task commitment
 */
commitmentsRouter.post(['/', '/create'], (req, res) => {
  try {
    const {
      title,
      verification_criteria,
      criteria,
      stake_amount = 5,
      stake,
      deadline,
      charity_pct = 50,
      stock_pct = 50,
      target_asset_id = '17d110fb-cc58-4959-b61c-9833ddf8f305', // NVDA
      target_asset_symbol = 'NVDA',
      lock_duration_months = 6,
      charity_wallet = 'SaveChi1d111111111111111111111111111111111',
      charity_name = 'Save the Children',
    } = req.body;

    const taskTitle = title || req.body.task_title;
    const taskCriteria = verification_criteria || criteria || 'Verify completion from proof';
    const finalStake = parseFloat(String(stake_amount || stake || 5));

    if (!taskTitle) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Default deadline to 2 hours from now if not specified
    let finalDeadline = deadline;
    if (!finalDeadline) {
      const twoHoursAhead = new Date(Date.now() + 2 * 60 * 60 * 1000);
      finalDeadline = twoHoursAhead.toISOString();
    }

    const commitmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      INSERT INTO commitments (
        id, user_id, title, verification_criteria, stake_amount, deadline,
        status, charity_pct, stock_pct, target_asset_id, target_asset_symbol,
        lock_duration_months, charity_wallet, charity_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      commitmentId,
      'admin',
      taskTitle,
      taskCriteria,
      finalStake,
      finalDeadline,
      'active',
      parseInt(String(charity_pct), 10),
      parseInt(String(stock_pct), 10),
      target_asset_id,
      target_asset_symbol,
      parseInt(String(lock_duration_months), 10),
      charity_wallet,
      charity_name,
      now
    );

    const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(commitmentId);

    res.json({
      success: true,
      commitment,
    });
  } catch (err: any) {
    console.error('Error creating commitment:', err);
    res.status(500).json({ error: err.message || 'Failed to create commitment' });
  }
});

/**
 * GET / (or /api/commitments, /api/challenges)
 * List all commitments
 */
commitmentsRouter.get('/', (_req, res) => {
  try {
    checkExpiredCommitments();
    const db = getDb();
    const commitments = db.prepare(`
      SELECT 
        c.*,
        (SELECT json_object('verified', v.verified, 'confidence', v.confidence, 'reasoning', v.verdict_reason) 
         FROM oracle_verdicts v 
         WHERE v.commitment_id = c.id 
         ORDER BY v.created_at DESC LIMIT 1) as latest_verdict,
        (SELECT t.id FROM forest_trees t WHERE t.commitment_id = c.id) as tree_id,
        (SELECT p.id FROM vault_positions p WHERE p.commitment_id = c.id) as vault_position_id
      FROM commitments c 
      ORDER BY 
        CASE c.status WHEN 'active' THEN 1 WHEN 'expired' THEN 2 ELSE 3 END,
        c.deadline ASC
    `).all();

    const parsed = commitments.map((c: any) => ({
      ...c,
      latest_verdict: c.latest_verdict ? JSON.parse(c.latest_verdict) : null,
      has_tree: !!c.tree_id,
      has_vault: !!c.vault_position_id,
    }));

    res.json({
      success: true,
      commitments: parsed,
      count: parsed.length,
    });
  } catch (err: any) {
    console.error('Error fetching commitments:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch commitments' });
  }
});

/**
 * Judge Demo Trigger: Simulate deadline expired immediately
 * POST /simulate-expire, POST /:id/simulate-expire
 */
commitmentsRouter.post(['/simulate-expire', '/:id/simulate-expire'], (req, res) => {
  try {
    const commitmentId = req.params.id || req.body.commitment_id || req.body.challenge_id;
    if (!commitmentId) {
      return res.status(400).json({ error: 'commitment_id is required' });
    }

    const db = getDb();
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();

    db.prepare(`
      UPDATE commitments 
      SET status = 'expired', deadline = ? 
      WHERE id = ? AND status = 'active'
    `).run(pastDate, commitmentId);

    const updated = db.prepare('SELECT * FROM commitments WHERE id = ?').get(commitmentId);

    res.json({
      success: true,
      message: 'Deadline simulated as expired for Judge Demo',
      commitment: updated,
    });
  } catch (err: any) {
    console.error('Error simulating deadline expiration:', err);
    res.status(500).json({ error: err.message || 'Failed to simulate expiration' });
  }
});

/**
 * Failure Settlement Engine: Consequence Roulette & Mainnet Execution
 * POST /settle-failure, POST /:id/settle-failure, POST /trigger-failure, POST /:id/trigger-failure
 */
commitmentsRouter.post(
  ['/settle-failure', '/:id/settle-failure', '/trigger-failure', '/:id/trigger-failure'],
  async (req, res) => {
    try {
      const commitmentId = req.params.id || req.body.commitment_id || req.body.challenge_id;
      const forcedOutcome = req.body.forced_outcome as 'charity' | 'stock_lock' | undefined;

      if (!commitmentId) {
        return res.status(400).json({ error: 'commitment_id or challenge_id is required' });
      }

      const result = await settleCommitmentFailure(commitmentId, forcedOutcome);
      res.json(result);
    } catch (err: any) {
      console.error('Error settling commitment failure:', err);
      res.status(500).json({ error: err.message || 'Failure settlement execution failed' });
    }
  }
);

/**
 * GET /:id
 * Single commitment details + full verdict history
 */
commitmentsRouter.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(req.params.id) as any;
    if (!commitment) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    const verdicts = db.prepare('SELECT * FROM oracle_verdicts WHERE commitment_id = ? ORDER BY created_at DESC').all(req.params.id);
    const tree = db.prepare('SELECT * FROM forest_trees WHERE commitment_id = ?').get(req.params.id);
    const vaultPosition = db.prepare('SELECT * FROM vault_positions WHERE commitment_id = ?').get(req.params.id);

    res.json({
      success: true,
      commitment: {
        ...commitment,
        verdicts,
        tree: tree || null,
        vault_position: vaultPosition || null,
      },
    });
  } catch (err: any) {
    console.error('Error fetching commitment details:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch commitment' });
  }
});

/**
 * POST /:id/verify OR POST /verify
 * Submit proof to Gemini AI Oracle validator
 */
commitmentsRouter.post(['/verify', '/:id/verify'], upload.single('image'), async (req, res) => {
  try {
    const commitmentId = req.params.id || req.body.commitment_id || req.body.challenge_id;
    const proofText = req.body.proof_text || req.body.proof || req.body.text_proof;
    const imageBase64 = req.body.image_base64 || req.body.proof_image;

    if (!commitmentId) {
      return res.status(400).json({ error: 'commitment_id or challenge_id is required' });
    }

    const db = getDb();
    const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(commitmentId) as any;
    if (!commitment) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    // Call Gemini AI Oracle
    const verdict = await verifyTaskProof({
      commitmentId,
      taskTitle: commitment.title,
      verificationCriteria: commitment.verification_criteria,
      proofText,
      proofImageBuffer: req.file?.buffer,
      proofImageBase64: imageBase64,
      mimeType: req.file?.mimetype || 'image/png',
    });

    let treePlanted = false;
    let treeData: any = null;
    let totalXp = 0;

    // If verified with >= 0.6 confidence, resolve commitment & plant tree in Wealth Forest
    if (verdict.verified && verdict.confidence >= 0.6) {
      db.prepare(`
        UPDATE commitments 
        SET status = 'verified', resolved_at = datetime('now')
        WHERE id = ?
      `).run(commitmentId);

      const plantResult = plantTree('admin', commitmentId, commitment.target_asset_symbol || 'NVDA');
      treePlanted = true;
      treeData = plantResult.tree;
      totalXp = plantResult.totalXp;
    }

    // Fetch updated commitment
    const updatedCommitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(commitmentId);

    res.json({
      success: true,
      verified: verdict.verified,
      confidence: verdict.confidence,
      reasoning: verdict.reasoning,
      verdict_reason: verdict.verdict_reason,
      tree_planted: treePlanted,
      tree: treeData,
      total_xp: totalXp,
      commitment: updatedCommitment,
    });
  } catch (err: any) {
    console.error('Error verifying commitment proof:', err);
    res.status(500).json({ error: err.message || 'Proof verification failed' });
  }
});
