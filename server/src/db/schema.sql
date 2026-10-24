---------------------------------------------------------------
-- USERS (admin user for MVP; extensible for multi-user)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT 'admin',
    external_ref_id TEXT NOT NULL DEFAULT 'admin',
    display_name    TEXT NOT NULL DEFAULT 'Demo User',
    tm_user_id      TEXT,
    solana_address  TEXT,
    evm_address     TEXT,
    forest_xp       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- COMMITMENTS (Task Bets / Commitment Contracts)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commitments (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id),
    title               TEXT NOT NULL,
    verification_criteria TEXT NOT NULL,
    stake_amount        REAL NOT NULL,
    deadline            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active',
    charity_pct         INTEGER NOT NULL DEFAULT 50,
    stock_pct           INTEGER NOT NULL DEFAULT 50,
    target_asset_id     TEXT NOT NULL,
    target_asset_symbol TEXT NOT NULL DEFAULT 'NVDA',
    lock_duration_months INTEGER NOT NULL DEFAULT 6,
    charity_wallet      TEXT NOT NULL,
    charity_name        TEXT NOT NULL DEFAULT 'Charity',
    consequence_outcome TEXT,
    resolved_at         TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- AI ORACLE VERDICTS (audit log for verification attempts)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oracle_verdicts (
    id              TEXT PRIMARY KEY,
    commitment_id   TEXT NOT NULL REFERENCES commitments(id),
    proof_type      TEXT NOT NULL,
    proof_data      TEXT NOT NULL,
    verified        INTEGER NOT NULL,
    confidence      REAL NOT NULL,
    verdict_reason  TEXT NOT NULL,
    raw_response    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- FOREST TREES (one per completed commitment)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forest_trees (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    commitment_id   TEXT NOT NULL REFERENCES commitments(id) UNIQUE,
    ticker_symbol   TEXT NOT NULL,
    tree_type       TEXT NOT NULL DEFAULT 'oak',
    xp_earned       INTEGER NOT NULL DEFAULT 10,
    planted_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- TIME-LOCKED VAULT POSITIONS (forced stock purchases)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_positions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    commitment_id   TEXT REFERENCES commitments(id),
    asset_id        TEXT NOT NULL,
    asset_symbol    TEXT NOT NULL,
    qty             REAL NOT NULL,
    purchase_price  REAL NOT NULL,
    purchase_total  REAL NOT NULL,
    gateway_order_id TEXT NOT NULL,
    lock_until      TEXT NOT NULL,
    is_unlocked     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- GATEWAY TRANSACTION LOG (audit trail for all mainnet ops)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gateway_transactions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    tx_type         TEXT NOT NULL,
    direction       TEXT,
    asset_symbol    TEXT,
    amount          REAL,
    gateway_id      TEXT NOT NULL,
    status          TEXT NOT NULL,
    raw_request     TEXT,
    raw_response    TEXT,
    commitment_id   TEXT REFERENCES commitments(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

---------------------------------------------------------------
-- CHARITY WALLETS (pre-configured verified charities)
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_wallets (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    wallet_address  TEXT NOT NULL,
    chain           TEXT NOT NULL DEFAULT 'solana',
    description     TEXT,
    logo_url        TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1
);

