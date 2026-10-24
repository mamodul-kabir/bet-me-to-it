import { Router } from 'express';
import crypto from 'node:crypto';
import { gatewayClient } from '../gateway/client.js';
import { getDb } from '../db/connection.js';
import { checkSellLocked } from '../services/vault.js';
import type { GatewayBalance } from '../gateway/types.js';

export const gatewayRouter = Router();

// PYUSD asset ID on Solana from Gateway catalog
export const SOLANA_PYUSD_ASSET_ID = '9021d7aa-2af9-4157-82f9-d6eadea5701a';

// Featured spotlight assets for trading & Forest linking
export const FEATURED_MARKETS: Array<{
  id: string;
  symbol: string;
  name: string;
  asset_class: 'stock' | 'crypto';
  venue: string;
  decimals: number;
}> = [
  { id: '17d110fb-cc58-4959-b61c-9833ddf8f305', symbol: 'NVDA', name: 'Nvidia Corp (Tokenized)', asset_class: 'stock', venue: 'defi', decimals: 18 },
  { id: '798d1877-9fab-4102-b558-188a83f0951d', symbol: 'TSLA', name: 'Tesla Inc (Tokenized)', asset_class: 'stock', venue: 'defi', decimals: 18 },
  { id: '6ed20aa3-e8f2-490a-9626-b97b1e6496f4', symbol: 'AAPL', name: 'Apple Inc (Tokenized)', asset_class: 'stock', venue: 'defi', decimals: 8 },
  { id: '495e07ac-fa3e-4179-85b7-b1e8cece3dc4', symbol: 'SOL', name: 'Solana', asset_class: 'crypto', venue: 'defi', decimals: 9 },
  { id: '938fbf0c-6c4d-4c95-a99d-0dc647278ab7', symbol: 'BTC', name: 'Bitcoin', asset_class: 'crypto', venue: 'defi', decimals: 8 },
  { id: 'd55cca34-5afd-494f-a943-ffe0fdc0d7b5', symbol: 'ETH', name: 'Ethereum', asset_class: 'crypto', venue: 'defi', decimals: 18 },
];

/**
 * POST /api/gateway/auth
 * Authenticate org, provision/fetch user wallets, and sync DB user
 */
gatewayRouter.post('/auth', async (_req, res) => {
  try {
    const user = await gatewayClient.getOrCreateUser();
    const balances = await gatewayClient.getBalances();

    const solWallet = user.wallets.find((w) => w.chain_family === 'solana');
    const evmWallet = user.wallets.find((w) => w.chain_family === 'evm');

    // Sync to SQLite users table
    const db = getDb();
    db.prepare(`
      INSERT INTO users (id, external_ref_id, tm_user_id, solana_address, evm_address)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tm_user_id = excluded.tm_user_id,
        solana_address = excluded.solana_address,
        evm_address = excluded.evm_address
    `).run('admin', user.external_ref_id, user.user_id, solWallet?.address || null, evmWallet?.address || null);

    res.json({
      success: true,
      user: {
        id: 'admin',
        tm_user_id: user.user_id,
        external_ref_id: user.external_ref_id,
        solana_address: solWallet?.address || null,
        evm_address: evmWallet?.address || null,
      },
      balances,
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/auth:', err);
    res.status(500).json({ error: err.message || 'Authentication failed' });
  }
});

/**
 * GET /api/gateway/wallet
 * Fetch live wallet balances and provisioned addresses
 */
gatewayRouter.get('/wallet', async (_req, res) => {
  try {
    const user = await gatewayClient.ensureUserInitialized();
    const balances = await gatewayClient.getBalances();

    const solWallet = user.wallets.find((w) => w.chain_family === 'solana');
    const evmWallet = user.wallets.find((w) => w.chain_family === 'evm');

    const pyusdEntry = balances.find(
      (b: GatewayBalance) => b.symbol.toUpperCase() === 'PYUSD'
    );
    const pyusdBalance = pyusdEntry ? parseFloat(pyusdEntry.available) : 0;

    res.json({
      success: true,
      solana_address: solWallet?.address || null,
      evm_address: evmWallet?.address || null,
      pyusd_balance: pyusdBalance,
      balances,
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/wallet:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch wallet balances' });
  }
});

/**
 * GET /api/gateway/markets
 * Fetch tradable assets list with live price snapshots
 */
gatewayRouter.get('/markets', async (_req, res) => {
  try {
    const marketsWithPrices = await Promise.all(
      FEATURED_MARKETS.map(async (asset) => {
        try {
          const candleData = await gatewayClient.getCandles(asset.symbol, '1d', '1h');
          const latestCandle = candleData.candles?.[candleData.candles.length - 1];
          const firstCandle = candleData.candles?.[0];
          const price = latestCandle ? parseFloat(latestCandle.close) : 0;
          const openPrice = firstCandle ? parseFloat(firstCandle.open) : price;
          const change24h = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;

          return {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            asset_class: asset.asset_class,
            venue: asset.venue,
            price: parseFloat(price.toFixed(price > 10 ? 2 : 4)),
            change_24h: parseFloat(change24h.toFixed(2)),
            decimals: asset.decimals,
          };
        } catch {
          return {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            asset_class: asset.asset_class,
            venue: asset.venue,
            price: 0,
            change_24h: 0,
            decimals: asset.decimals,
          };
        }
      })
    );

    res.json({
      success: true,
      markets: marketsWithPrices,
      count: marketsWithPrices.length,
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/markets:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch markets' });
  }
});

/**
 * GET /api/gateway/markets/:symbol/candles
 * Historical price candles for charting
 */
gatewayRouter.get('/markets/:symbol/candles', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const window = (req.query.window as string) || '1d';
    const resolution = (req.query.resolution as string) || '1h';

    const data = await gatewayClient.getCandles(symbol, window, resolution);
    res.json(data);
  } catch (err: any) {
    console.error(`Error in /api/gateway/markets/${req.params.symbol}/candles:`, err);
    res.status(404).json({ error: err.message || 'Candles not found for symbol' });
  }
});

/**
 * POST /api/gateway/trade
 * Execute buy or sell order via True Markets Gateway with 20 bps fee accounting
 */
gatewayRouter.post('/trade', async (req, res) => {
  try {
    const {
      asset_id,
      asset_symbol,
      qty,
      qty_unit = 'quote',
      side = 'buy',
      type = 'market',
      price,
      commitment_id,
    } = req.body;

    if (!asset_id || !qty) {
      return res.status(400).json({ error: 'Missing required fields: asset_id and qty are required' });
    }

    const db = getDb();

    // Enforce sell lock on time-locked vault positions
    if (side === 'sell') {
      const lockedPos = checkSellLocked(asset_symbol || asset_id, 'admin');
      if (lockedPos) {
        return res.status(403).json({
          error: `Cannot sell ${asset_symbol || 'asset'}: Position is locked in Time-Locked Vault until ${lockedPos.lock_until} (${lockedPos.days_remaining} days remaining)`,
          locked_position: lockedPos,
        });
      }
    }

    // Execute order via Gateway client (signs payloads locally)
    const orderResult = await gatewayClient.createAndExecuteOrder({
      asset_id,
      qty: String(qty),
      qty_unit,
      side,
      type,
      price: price ? String(price) : undefined,
    });

    const parsedQty = parseFloat(qty);
    const feeRate = 0.002; // 20 bps (0.2%)
    const feeAmount = parseFloat((parsedQty * feeRate).toFixed(4));
    const totalCost = side === 'buy' ? parsedQty + feeAmount : parsedQty - feeAmount;

    const orderId = orderResult.id || orderResult.order_id || `ord-${crypto.randomUUID()}`;

    // Record in SQLite transaction log
    db.prepare(`
      INSERT INTO gateway_transactions (
        id, user_id, tx_type, direction, asset_symbol, amount, gateway_id, status, raw_request, raw_response, commitment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'admin',
      'order',
      side,
      asset_symbol || 'UNKNOWN',
      parsedQty,
      orderId,
      'executed',
      JSON.stringify(req.body),
      JSON.stringify(orderResult),
      commitment_id || null
    );

    res.json({
      success: true,
      order: orderResult,
      fee_breakdown: {
        fee_bps: 20,
        fee_pct: '0.20%',
        fee_amount: feeAmount,
        subtotal: parsedQty,
        grand_total: totalCost,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/trade:', err);
    res.status(500).json({ error: err.message || 'Trade execution failed' });
  }
});

/**
 * POST /api/gateway/transfer
 * Execute PYUSD or token transfer via True Markets Gateway
 */
gatewayRouter.post('/transfer', async (req, res) => {
  try {
    const {
      to,
      destination_address,
      qty,
      amount,
      asset_id = SOLANA_PYUSD_ASSET_ID,
      commitment_id,
    } = req.body;

    const recipient = to || destination_address;
    const transferQty = qty || amount;

    if (!recipient || !transferQty) {
      return res.status(400).json({ error: 'Missing required fields: to/destination_address and qty/amount are required' });
    }

    const transferResult = await gatewayClient.createAndExecuteTransfer({
      to: recipient,
      qty: String(transferQty),
      asset_id,
      qty_unit: 'base',
    });

    const transferId = transferResult.id || transferResult.transfer_id || `tx-${crypto.randomUUID()}`;

    // Record in SQLite transaction log
    const db = getDb();
    db.prepare(`
      INSERT INTO gateway_transactions (
        id, user_id, tx_type, direction, asset_symbol, amount, gateway_id, status, raw_request, raw_response, commitment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'admin',
      'transfer',
      'send',
      'PYUSD',
      parseFloat(String(transferQty)),
      transferId,
      'executed',
      JSON.stringify(req.body),
      JSON.stringify(transferResult),
      commitment_id || null
    );

    res.json({
      success: true,
      transfer: transferResult,
      recipient,
      amount: transferQty,
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/transfer:', err);
    res.status(500).json({ error: err.message || 'Transfer execution failed' });
  }
});

/**
 * GET /api/gateway/orders
 * List orders from Gateway
 */
gatewayRouter.get('/orders', async (_req, res) => {
  try {
    const orders = await gatewayClient.getOrders();
    res.json({
      success: true,
      orders: orders.data || orders || [],
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/orders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

/**
 * GET /api/gateway/transactions
 * Unified transaction history combining Gateway and local DB audit records
 */
gatewayRouter.get('/transactions', async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const db = getDb();

    // Query local DB records
    let localTxs: any[];
    if (type) {
      localTxs = db.prepare('SELECT * FROM gateway_transactions WHERE tx_type = ? ORDER BY created_at DESC').all(type);
    } else {
      localTxs = db.prepare('SELECT * FROM gateway_transactions ORDER BY created_at DESC').all();
    }

    // Attempt to fetch Gateway transactions
    let gatewayTxs: any[] = [];
    try {
      const gwRes = await gatewayClient.getTransactions(type);
      gatewayTxs = gwRes.data || gwRes || [];
    } catch {
      // Gateway transactions may be empty or unavailable on initial account
    }

    res.json({
      success: true,
      transactions: localTxs,
      gateway_remote_count: gatewayTxs.length,
    });
  } catch (err: any) {
    console.error('Error in /api/gateway/transactions:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch transactions' });
  }
});

