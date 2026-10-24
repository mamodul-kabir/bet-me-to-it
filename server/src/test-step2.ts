process.env.TEST_MODE = 'true';

import { migrate } from './db/migrate.js';
import { getDb } from './db/connection.js';
import { app } from './index.js';
import type { Server } from 'node:http';

async function runStep2Test() {
  console.log('====================================================');
  console.log('  True Markets Gateway Step 2 Verification Test');
  console.log('====================================================\n');

  // 1. Run migrations
  console.log('[1/8] Testing SQLite database migration & seeds...');
  migrate();
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get('admin') as any;
  const charities = db.prepare('SELECT * FROM charity_wallets').all();
  if (!user || charities.length === 0) {
    throw new Error('Database migration failed to seed user or charities');
  }
  console.log(`  ✓ Database ready: User seeded (${user.id}), ${charities.length} charities loaded\n`);

  // Start temporary server on test port 3099
  const testPort = 3099;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 2. Test POST /api/gateway/auth
    console.log('[2/8] Testing POST /api/gateway/auth...');
    const authRes = await fetch(`${baseUrl}/api/gateway/auth`, { method: 'POST' });
    if (!authRes.ok) {
      throw new Error(`Auth endpoint failed with status ${authRes.status}: ${await authRes.text()}`);
    }
    const authData = await authRes.json();
    console.log(`  ✓ Auth returned user ID: ${authData.user.tm_user_id}`);
    console.log(`  ✓ Solana address: ${authData.user.solana_address}`);
    console.log(`  ✓ EVM address:    ${authData.user.evm_address}\n`);

    // 3. Test GET /api/gateway/wallet
    console.log('[3/8] Testing GET /api/gateway/wallet...');
    const walletRes = await fetch(`${baseUrl}/api/gateway/wallet`);
    if (!walletRes.ok) {
      throw new Error(`Wallet endpoint failed with status ${walletRes.status}`);
    }
    const walletData = await walletRes.json();
    console.log(`  ✓ Live PYUSD Balance: $${walletData.pyusd_balance}`);
    console.log(`  ✓ Total asset entries: ${walletData.balances.length}\n`);

    // 4. Test GET /api/gateway/markets
    console.log('[4/8] Testing GET /api/gateway/markets...');
    const marketsRes = await fetch(`${baseUrl}/api/gateway/markets`);
    if (!marketsRes.ok) {
      throw new Error(`Markets endpoint failed with status ${marketsRes.status}`);
    }
    const marketsData = await marketsRes.json();
    console.log(`  ✓ Retrieved ${marketsData.markets.length} featured market pairs:`);
    for (const m of marketsData.markets) {
      console.log(`    • ${m.symbol.padEnd(6)} (${m.name}): $${m.price} (${m.change_24h}%) [${m.asset_class}]`);
    }
    console.log('');

    // 5. Test GET /api/gateway/markets/:symbol/candles
    console.log('[5/8] Testing GET /api/gateway/markets/NVDA/candles...');
    const candleRes = await fetch(`${baseUrl}/api/gateway/markets/NVDA/candles?window=1d&resolution=1h`);
    if (!candleRes.ok) {
      throw new Error(`Candles endpoint failed with status ${candleRes.status}`);
    }
    const candleData = await candleRes.json();
    console.log(`  ✓ Received ${candleData.candles?.length || 0} candles for ${candleData.symbol}`);
    if (candleData.candles?.length > 0) {
      const c = candleData.candles[0];
      console.log(`    Sample candle: open=$${c.open}, close=$${c.close}, high=$${c.high}, low=$${c.low}\n`);
    }

    // 6. Test GET /api/charities
    console.log('[6/8] Testing GET /api/charities...');
    const charityRes = await fetch(`${baseUrl}/api/charities`);
    if (!charityRes.ok) {
      throw new Error(`Charities endpoint failed with status ${charityRes.status}`);
    }
    const charityData = await charityRes.json();
    console.log(`  ✓ Retrieved ${charityData.charities.length} verified charity options:`);
    for (const c of charityData.charities) {
      console.log(`    • ${c.name} (${c.chain}): ${c.wallet_address}`);
    }
    console.log('');

    // 7. Test POST /api/gateway/trade endpoint & fee accounting
    console.log('[7/8] Testing POST /api/gateway/trade endpoint & fee calculation...');
    const solMarket = marketsData.markets.find((m: any) => m.symbol === 'SOL');
    if (!solMarket) {
      throw new Error('SOL market not found in featured markets');
    }

    console.log(`  Submitting $2 buy order for ${solMarket.symbol} (asset_id: ${solMarket.id})...`);
    const tradeRes = await fetch(`${baseUrl}/api/gateway/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: solMarket.id,
        asset_symbol: solMarket.symbol,
        qty: '2',
        qty_unit: 'quote',
        side: 'buy',
        type: 'market',
      }),
    });

    const tradeData = await tradeRes.json();
    if (!tradeRes.ok) {
      throw new Error(`Trade failed with status ${tradeRes.status}: ${JSON.stringify(tradeData)}`);
    }

    console.log(`  ✓ Order executed successfully on True Markets Gateway!`);
    console.log(`    Fee bps: ${tradeData.fee_breakdown.fee_bps} (${tradeData.fee_breakdown.fee_pct})`);
    console.log(`    Fee amount: $${tradeData.fee_breakdown.fee_amount}`);
    console.log(`    Subtotal: $${tradeData.fee_breakdown.subtotal}`);
    console.log(`    Grand total: $${tradeData.fee_breakdown.grand_total}\n`);

    // 8. Test GET /api/gateway/transactions (verify transaction audit logging in SQLite)
    console.log('[8/8] Testing GET /api/gateway/transactions & SQLite audit log...');
    const txRes = await fetch(`${baseUrl}/api/gateway/transactions`);
    const txData = await txRes.json();
    console.log(`  ✓ Local audit log has ${txData.transactions.length} recorded transactions.`);
    if (txData.transactions.length > 0) {
      const latest = txData.transactions[0];
      console.log(`    Latest TX: type=${latest.tx_type}, direction=${latest.direction}, asset=${latest.asset_symbol}, amount=${latest.amount}, status=${latest.status}`);
    }

    console.log('\n====================================================');
    console.log('  ALL STEP 2 CORE BACKEND ROUTES VERIFIED!          ');
    console.log('====================================================\n');
    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

runStep2Test().catch((err) => {
  console.error('\n❌ STEP 2 TEST FAILED:', err);
  process.exit(1);
});
