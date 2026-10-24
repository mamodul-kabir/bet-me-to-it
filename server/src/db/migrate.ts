import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './connection.js';

export function migrate(): void {
  const db = getDb();

  // 1. Run schema DDL
  const schemaPath = path.resolve(import.meta.dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // 2. Seed Admin User
  const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get('admin');
  if (!userCheck) {
    db.prepare(`
      INSERT INTO users (id, external_ref_id, display_name, forest_xp)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin', 'Shipyard Fintech Trader', 0);
  }

  // 3. Seed Verified Charities
  const charityCount = (db.prepare('SELECT count(*) as count FROM charity_wallets').get() as any).count;
  if (charityCount === 0) {
    const insertCharity = db.prepare(`
      INSERT INTO charity_wallets (id, name, wallet_address, chain, description, logo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertCharity.run(
      'charity-save-children',
      'Save the Children',
      'Ff1nEWtJ98CZc8qGozcpHVf2VRAxveMGBJ1R8CMhouAt',
      'solana',
      'Provides emergency aid, education, and healthcare for children in crisis worldwide.',
      'https://api.dicebear.com/7.x/identicon/svg?seed=savethechildren'
    );

    insertCharity.run(
      'charity-code-org',
      'Code.org Foundation',
      'GqpeRjhXhKDV67rnDeefkgMvRHV5gzxQvBy7c4m1gNEn',
      'solana',
      'Dedicated to expanding access to computer science in schools and increasing participation by young women.',
      'https://api.dicebear.com/7.x/identicon/svg?seed=codeorg'
    );

    insertCharity.run(
      'charity-against-malaria',
      'Against Malaria Foundation',
      'CjQiZvFsj4EDPwoJcX2Hg4yBJakWSCVctYwongJ9ieZY',
      'solana',
      'Top-rated charity providing long-lasting insecticidal nets to prevent malaria in high-risk regions.',
      'https://api.dicebear.com/7.x/identicon/svg?seed=malaria'
    );
  }
}

