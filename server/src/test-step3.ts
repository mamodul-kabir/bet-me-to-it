process.env.TEST_MODE = 'true';

import { migrate } from './db/migrate.js';
import { getDb } from './db/connection.js';
import { app } from './index.js';
import type { Server } from 'node:http';

async function runStep3Test() {
  console.log('====================================================');
  console.log('  Task Commitments & AI Oracle Step 3 Test');
  console.log('====================================================\n');

  // 1. Database readiness
  console.log('[1/6] Initializing database & clean test state...');
  migrate();
  const db = getDb();
  console.log('  ✓ Database ready.\n');

  // Start test server on port 3098
  const testPort = 3098;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 2. Test POST /api/challenges/create (High-stakes commitment creation)
    console.log('[2/6] Testing POST /api/challenges/create...');
    const createRes = await fetch(`${baseUrl}/api/challenges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Complete 2 LeetCode Medium problems',
        verification_criteria: 'Screenshot showing 2 accepted LeetCode Medium solutions submitted today',
        stake_amount: 5,
        deadline: new Date(Date.now() + 3600 * 1000).toISOString(),
        charity_pct: 50,
        stock_pct: 50,
        target_asset_id: '17d110fb-cc58-4959-b61c-9833ddf8f305',
        target_asset_symbol: 'NVDA',
        lock_duration_months: 6,
        charity_wallet: 'SaveChi1d111111111111111111111111111111111',
        charity_name: 'Save the Children',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create challenge: ${createRes.status} ${await createRes.text()}`);
    }

    const createData = await createRes.json();
    const challenge1 = createData.commitment;
    console.log(`  ✓ Created task bet: "${challenge1.title}" (ID: ${challenge1.id})`);
    console.log(`    Stake: $${challenge1.stake_amount} PYUSD`);
    console.log(`    Odds Split: ${challenge1.charity_pct}% Charity / ${challenge1.stock_pct}% Time-Locked ${challenge1.target_asset_symbol}`);
    console.log(`    Status: ${challenge1.status}\n`);

    // 3. Test GET /api/challenges
    console.log('[3/6] Testing GET /api/challenges list & details...');
    const listRes = await fetch(`${baseUrl}/api/challenges`);
    const listData = await listRes.json();
    const found = listData.commitments.find((c: any) => c.id === challenge1.id);
    if (!found) {
      throw new Error('Created commitment not found in list response');
    }
    console.log(`  ✓ Challenge retrieved in list: count=${listData.commitments.length}`);

    const detailRes = await fetch(`${baseUrl}/api/challenges/${challenge1.id}`);
    const detailData = await detailRes.json();
    console.log(`  ✓ Challenge detail fetched: status=${detailData.commitment.status}\n`);

    // 4. Test POST /api/challenges/verify with valid proof
    console.log('[4/6] Testing POST /api/challenges/verify with valid task proof...');
    // Simulated base64 image (1x1 PNG) + descriptive text
    const sampleImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const verifyRes = await fetch(`${baseUrl}/api/challenges/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_id: challenge1.id,
        text_proof: 'Completed and submitted 2 LeetCode Medium problems (33. Search in Rotated Sorted Array & 200. Number of Islands). Both accepted with 100% test cases passed.',
        image_base64: sampleImageBase64,
      }),
    });

    if (!verifyRes.ok) {
      throw new Error(`Verification endpoint failed: ${verifyRes.status} ${await verifyRes.text()}`);
    }

    const verifyData = await verifyRes.json();
    console.log(`  ✓ Oracle Verdict Received:`);
    console.log(`    Verified:    ${verifyData.verified}`);
    console.log(`    Confidence:  ${verifyData.confidence}`);
    console.log(`    Reasoning:   "${verifyData.reasoning}"`);
    console.log(`    Tree Planted: ${verifyData.tree_planted}`);
    console.log(`    Forest XP:   ${verifyData.total_xp} XP\n`);

    if (!verifyData.verified || verifyData.confidence < 0.6 || !verifyData.tree_planted) {
      throw new Error('Expected positive verification verdict with tree planting');
    }

    // 5. Test negative verification on a second challenge
    console.log('[5/6] Testing negative verification with rejected proof...');
    const createRes2 = await fetch(`${baseUrl}/api/challenges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Calc III Homework: Stokes Theorem Proof',
        verification_criteria: 'Detailed derivation of Stokes Theorem with surface integral diagram',
        stake_amount: 10,
        deadline: new Date(Date.now() + 7200 * 1000).toISOString(),
        charity_pct: 60,
        stock_pct: 40,
        target_asset_symbol: 'TSLA',
      }),
    });
    const challenge2 = (await createRes2.json()).commitment;

    const rejectRes = await fetch(`${baseUrl}/api/challenges/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_id: challenge2.id,
        text_proof: 'hi', // Insufficient proof
      }),
    });

    const rejectData = await rejectRes.json();
    console.log(`  ✓ Negative Verification Handled:`);
    console.log(`    Verified:    ${rejectData.verified}`);
    console.log(`    Confidence:  ${rejectData.confidence}`);
    console.log(`    Reasoning:   "${rejectData.reasoning}"`);
    console.log(`    Tree Planted: ${rejectData.tree_planted}\n`);

    if (rejectData.verified === true) {
      throw new Error('Expected bogus proof to be rejected by the Oracle');
    }

    // 6. Test GET /api/forest
    console.log('[6/6] Testing GET /api/forest (Wealth Forest stats)...');
    const forestRes = await fetch(`${baseUrl}/api/forest`);
    const forestData = await forestRes.json();
    console.log(`  ✓ Wealth Forest Stats:`);
    console.log(`    Total XP:     ${forestData.total_xp} XP`);
    console.log(`    XP Tier:      ${forestData.xp_tier} (Level ${forestData.level})`);
    console.log(`    Planted Trees: ${forestData.trees.length}`);
    for (const tree of forestData.trees) {
      console.log(`    • Tree variant "${tree.tree_type}" linked to ticker ${tree.ticker_symbol} (+${tree.xp_earned} XP)`);
    }

    // Verify database audit records
    const auditCount = (db.prepare('SELECT count(*) as c FROM oracle_verdicts').get() as any).c;
    console.log(`\n  ✓ Database oracle_verdicts audit log has ${auditCount} recorded evaluations.`);

    console.log('\n====================================================');
    console.log('  ALL STEP 3 TASK COMMITMENTS & AI ORACLE VERIFIED!  ');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

runStep3Test().catch((err) => {
  console.error('\n❌ STEP 3 TEST FAILED:', err);
  process.exit(1);
});

