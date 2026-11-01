-- V6: Separate system wallets and configurable game settlement commission.
-- Existing user wallets and points_transactions are intentionally untouched.

ALTER TABLE game_rounds
    ADD COLUMN commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    ADD COLUMN settlement_status VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN total_pool BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN commission_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN winning_pool BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN settled_at TIMESTAMPTZ,
    ADD CONSTRAINT chk_game_round_commission
        CHECK (commission_percent >= 0 AND commission_percent < 100),
    ADD CONSTRAINT chk_game_round_settlement_status
        CHECK (settlement_status IN ('PENDING', 'SETTLED')),
    ADD CONSTRAINT chk_game_round_settlement_amounts
        CHECK (total_pool >= 0 AND commission_amount >= 0 AND winning_pool >= 0);

CREATE TABLE game_commission_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES users(id),
    CONSTRAINT chk_game_commission_percent
        CHECK (commission_percent >= 0 AND commission_percent < 100)
);

INSERT INTO game_commission_settings (id, commission_percent)
VALUES (1, 5.00);

CREATE TABLE system_wallets (
    id SMALLSERIAL PRIMARY KEY,
    wallet_type VARCHAR(20) NOT NULL UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_system_wallet_type
        CHECK (wallet_type IN ('PLATFORM', 'ADMIN')),
    CONSTRAINT chk_system_wallet_balance
        CHECK (balance >= 0)
);

INSERT INTO system_wallets (wallet_type, balance)
VALUES ('PLATFORM', 0), ('ADMIN', 0);

CREATE TABLE system_wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id SMALLINT NOT NULL REFERENCES system_wallets(id),
    round_id BIGINT REFERENCES game_rounds(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(40) NOT NULL,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_system_wallet_transaction_type
        CHECK (transaction_type IN (
            'COMMISSION_CREDIT',
            'NO_WINNER_POOL_CREDIT',
            'SINGLE_PLAYER_REWARD_DEBIT',
            'ADMIN_FUND_CREDIT',
            'PLATFORM_FUND_CREDIT'
        ))
);

CREATE INDEX idx_system_wallet_transactions_wallet
    ON system_wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX idx_system_wallet_transactions_round
    ON system_wallet_transactions(round_id);

CREATE TABLE game_commission_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    old_percent NUMERIC(5,2) NOT NULL,
    new_percent NUMERIC(5,2) NOT NULL,
    changed_by BIGINT REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
