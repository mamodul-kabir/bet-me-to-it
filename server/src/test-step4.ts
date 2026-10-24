process.env.TEST_MODE = 'true';

import { migrate } from './db/migrate.js';
import { getDb } from './db/connection.js';
import { app } from './index.js';
import type { Server } from 'node:http';

async function runStep4Test() {
  console.log('====================================================');
  console.log('  Penalty Settlement & Time-Locked Vault Step 4 Test');
  console.log('====================================================\n');

  // 1. Initial State
  console.log('[1/6] Preparing database state...');
  migrate();
  const db = getDb();
  console.log('  ✓ Database ready.\n');

  // Start test server on port 3097
  const testPort = 3097;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 2. Create commitment for testing failure
    console.log('[2/6] Creating commitment to test Judge Demo Trigger...');
    const createRes = await fetch(`${baseUrl}/api/challenges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '30-minute Morning Cardio Workout',
        verification_criteria: 'Fitness tracker summary showing 30 mins active cardio',
        stake_amount: 5,
        deadline: new Date(Date.now() + 86400 * 1000).toISOString(), // 24 hours in future
        charity_pct: 50,
        stock_pct: 50,
        target_asset_symbol: 'NVDA',
        lock_duration_months: 6,
      }),
    });

    const createData = await createRes.json();
    const challenge1 = createData.commitment;
    console.log(`  ✓ Created task: "${challenge1.title}" (Status: ${challenge1.status})`);
    console.log(`    Target Stock: ${challenge1.target_asset_symbol} (6 months lock)`);

    // 3. Test Judge Demo Trigger: Simulate Deadline Expired
    console.log('\n[3/6] Testing Judge Demo Trigger: POST /api/challenges/:id/simulate-expire...');
    const expireRes = await fetch(`${baseUrl}/api/challenges/${challenge1.id}/simulate-expire`, {
      method: 'POST',
    });

    if (!expireRes.ok) {
      throw new Error(`Simulate expire failed: ${expireRes.status}`);
    }
    const expireData = await expireRes.json();
    console.log(`  ✓ Judge Demo Trigger success: "${expireData.message}"`);
    console.log(`    New commitment status: ${expireData.commitment.status}`);
    if (expireData.commitment.status !== 'expired') {
      throw new Error('Expected status to be updated to "expired"');
    }

    // 4. Test Consequence Engine: Outcome B (Forced Stock Buy + Time-Locked Vault)
    console.log('\n[4/6] Testing Failure Settlement (Forced NVDA Stock Buy + Time Lock)...');
    const settleStockRes = await fetch(`${baseUrl}/api/challenges/settle-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_id: challenge1.id,
        forced_outcome: 'stock_lock',
      }),
    });

    if (!settleStockRes.ok) {
      throw new Error(`Settle failure failed: ${settleStockRes.status} ${await settleStockRes.text()}`);
    }

    const settleStockData = await settleStockRes.json();
    console.log(`  ✓ Consequence Roulette Result:`);
    console.log(`    Outcome:     ${settleStockData.outcome}`);
    console.log(`    Roll:        ${settleStockData.roll}/100 (Threshold: < ${settleStockData.charity_pct}% Charity)`);
    console.log(`    Asset:       ${settleStockData.vault_position.asset_symbol}`);
    console.log(`    Qty:         ${settleStockData.vault_position.qty}`);
    console.log(`    Price:       $${settleStockData.vault_position.purchase_price}`);
    console.log(`    Lock Until:  ${settleStockData.vault_position.lock_until}`);
    console.log(`    Commitment:  status=${settleStockData.commitment.status}, outcome=${settleStockData.commitment.consequence_outcome}`);

    // Verify vault position in database
    const vaultRow = db.prepare('SELECT * FROM vault_positions WHERE commitment_id = ?').get(challenge1.id) as any;
    if (!vaultRow || vaultRow.is_unlocked !== 0) {
      throw new Error('Expected vault_positions table to have locked position with is_unlocked = 0');
    }
    console.log(`  ✓ Verified vault_positions record in SQLite (ID: ${vaultRow.id})\n`);

    // 5. Test Sell Lock Enforcement: verify trade endpoint rejects selling locked asset
    console.log('[5/6] Testing Sell-Lock Enforcement: attempting to sell locked NVDA shares...');
    const sellRes = await fetch(`${baseUrl}/api/gateway/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: vaultRow.asset_id,
        asset_symbol: vaultRow.asset_symbol,
        qty: '1',
        qty_unit: 'quote',
        side: 'sell',
        type: 'market',
      }),
    });

    console.log(`  Sell endpoint HTTP status: ${sellRes.status}`);
    const sellData = await sellRes.json();
    console.log(`  Response message: "${sellData.error}"`);

    if (sellRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for selling locked position, got ${sellRes.status}`);
    }
    console.log(`  ✓ Sell lock enforced! Trading terminal prevented illegal sale of locked vault shares.\n`);

    // 6. Test Consequence Engine: Outcome A (Charity Slash Transfer) on a second challenge
    console.log('[6/6] Testing Failure Settlement (Charity Slash Transfer)...');
    const createRes2 = await fetch(`${baseUrl}/api/challenges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Review PR & Write Unit Tests',
        verification_criteria: 'GitHub PR link showing merge and test coverage report',
        stake_amount: 5,
        charity_pct: 70,
        stock_pct: 30,
        charity_wallet: 'SaveChi1d111111111111111111111111111111111',
        charity_name: 'Save the Children',
      }),
    });

    const challenge2 = (await createRes2.json()).commitment;

    const settleCharityRes = await fetch(`${baseUrl}/api/challenges/settle-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_id: challenge2.id,
        forced_outcome: 'charity',
      }),
    });

    const settleCharityData = await settleCharityRes.json();
    console.log(`  ✓ Consequence Roulette Result:`);
    console.log(`    Outcome:      ${settleCharityData.outcome}`);
    console.log(`    Destination:  ${settleCharityData.execution_details.destination}`);
    console.log(`    Charity:      ${settleCharityData.execution_details.charity_name}`);
    console.log(`    Amount:       $${settleCharityData.execution_details.amount} ${settleCharityData.execution_details.asset}`);
    console.log(`    Gateway ID:   ${settleCharityData.gateway_tx_id}`);
    console.log(`    Commitment:   status=${settleCharityData.commitment.status}, outcome=${settleCharityData.commitment.consequence_outcome}`);

    // Verify GET /api/vaults
    const vaultsRes = await fetch(`${baseUrl}/api/vaults`);
    const vaultsData = await vaultsRes.json();
    console.log(`\n  ✓ GET /api/vaults responded: ${vaultsData.locked.length} locked positions ($${vaultsData.total_locked_value} total value locked)`);
    for (const pos of vaultsData.locked) {
      console.log(`    • ${pos.asset_symbol}: ${pos.qty} shares locked until ${pos.lock_until} (${pos.days_remaining} days left, ${pos.progress_pct}% elapsed)`);
    }

    console.log('\n====================================================');
    console.log('  ALL STEP 4 PENALTY SETTLEMENT CHECKS PASSED!      ');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

runStep4Test().catch((err) => {
  console.error('\n❌ STEP 4 TEST FAILED:', err);
  process.exit(1);
});

