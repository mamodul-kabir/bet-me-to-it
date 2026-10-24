import { getOrgToken, getOrganizationId } from './gateway/auth.js';
import { signPayloads, getSignerExternalRefId } from './gateway/signer.js';
import { gatewayClient } from './gateway/client.js';

async function runStep1Test() {
  console.log('====================================================');
  console.log('  True Markets Gateway Step 1 Verification Test');
  console.log('====================================================\n');

  // Test 1: Authenticate with org key (ECDSA P-256 / ES256)
  console.log('[1/4] Minting & verifying Gateway organization JWT token...');
  const token = await getOrgToken();
  const orgId = await getOrganizationId();
  if (!token || !orgId) {
    throw new Error('Failed to acquire valid org token or organization ID');
  }
  console.log(`  ✓ Successfully minted ES256 JWT Organization Token`);
  console.log(`  ✓ Organization ID: ${orgId}`);
  console.log(`  ✓ Token preview: ${token.slice(0, 30)}...${token.slice(-10)}\n`);

  // Test 2: Provision / Fetch User & Wallets
  console.log('[2/4] Fetching or provisioning user and sub-wallets...');
  const user = await gatewayClient.getOrCreateUser();
  if (!user || !user.user_id) {
    throw new Error('Failed to get or create Gateway user');
  }
  console.log(`  ✓ User ID (TM-On-Behalf-Of): ${user.user_id}`);
  console.log(`  ✓ External Ref ID: ${user.external_ref_id}`);

  const solWallet = user.wallets.find((w) => w.chain_family === 'solana');
  const evmWallet = user.wallets.find((w) => w.chain_family === 'evm');

  if (solWallet) {
    console.log(`  ✓ Solana Wallet Address: ${solWallet.address}`);
  }
  if (evmWallet) {
    console.log(`  ✓ EVM Wallet Address:    ${evmWallet.address}`);
  }
  console.log('');

  // Test 3: Sign test payload with user signer key
  console.log('[3/4] Testing payload signing with test-signer-key.json...');
  const samplePayload = '{"action":"test_order_or_transfer_verification","amount":5}';
  const signatures = await signPayloads([samplePayload]);

  if (!signatures || signatures.length !== 1 || !signatures[0]) {
    throw new Error('Failed to sign payload using signer key');
  }

  // Verify decoded stamp structure
  const decodedStamp = JSON.parse(Buffer.from(signatures[0], 'base64url').toString('utf8'));
  if (
    decodedStamp.scheme !== 'SIGNATURE_SCHEME_TK_API_P256' ||
    !decodedStamp.publicKey ||
    !decodedStamp.signature
  ) {
    throw new Error(`Unexpected stamp payload structure: ${JSON.stringify(decodedStamp)}`);
  }
  console.log(`  ✓ Signed test payload successfully`);
  console.log(`  ✓ Signature Scheme: ${decodedStamp.scheme}`);
  console.log(`  ✓ Public Key: ${decodedStamp.publicKey}`);
  console.log(`  ✓ Stamp Header Value (base64url): ${signatures[0].slice(0, 30)}...\n`);

  // Test 4: Fetch live wallet balances from Gateway API
  console.log('[4/4] Fetching live balances via Gateway API...');
  const balances = await gatewayClient.getBalances();
  console.log(`  ✓ Retrieved ${balances.length} balance entries from Gateway:`);
  for (const b of balances) {
    console.log(`    • ${b.symbol} (${b.name}) on ${b.chain}: total=${b.total}, available=${b.available} [${b.venue}]`);
  }

  console.log('\n====================================================');
  console.log('  ALL STEP 1 VERIFICATION CHECKS PASSED SUCCESSFULLY!  ');
  console.log('====================================================\n');
}

runStep1Test().catch((err) => {
  console.error('\n❌ STEP 1 TEST FAILED:', err);
  process.exit(1);
});

