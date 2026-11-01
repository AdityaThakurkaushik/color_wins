-- V5: Game settlement, commission settings and platform wallet

-- 1. Allow new round statuses
ALTER TABLE game_rounds
    DROP CONSTRAINT IF EXISTS game_rounds_status_check;

ALTER TABLE game_rounds
    ADD CONSTRAINT game_rounds_status_check
    CHECK (status IN (
        'OPEN',
        'CLOSED',
        'RESULT_DECLARED',
        'SETTLED',
        'CANCELLED'
    ));

-- 2. Allow BLUE while retaining VIOLET for historical records
ALTER TABLE game_rounds
    DROP CONSTRAINT IF EXISTS game_rounds_result_color_check;

ALTER TABLE game_rounds
    ADD CONSTRAINT game_rounds_result_color_check
    CHECK (result_color IN ('RED', 'GREEN', 'BLUE', 'VIOLET'));

ALTER TABLE bets
    DROP CONSTRAINT IF EXISTS bets_selected_color_check;

ALTER TABLE bets
    ADD CONSTRAINT bets_selected_color_check
    CHECK (selected_color IN ('RED', 'GREEN', 'BLUE', 'VIOLET'));

-- 3. New settlement fields
ALTER TABLE game_rounds
    ADD COLUMN commission_percent NUMERIC(5,2),
    ADD COLUMN total_pool BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN commission_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN total_payout BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN settled_at TIMESTAMPTZ;

-- 4. Allow result declaration without a number
ALTER TABLE game_rounds
    DROP CONSTRAINT IF EXISTS game_rounds_check;

ALTER TABLE game_rounds
    ADD CONSTRAINT game_rounds_result_check
    CHECK (
        status <> 'RESULT_DECLARED'
        OR result_color IS NOT NULL
    );

-- 5. Allow player refunds
ALTER TABLE points_transactions
    DROP CONSTRAINT IF EXISTS points_transactions_transaction_type_check;

ALTER TABLE points_transactions
    ADD CONSTRAINT points_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'SIGNUP_BONUS',
        'BET_DEBIT',
        'BET_PAYOUT',
        'BET_REFUND',
        'ADMIN_ADJUSTMENT'
    ));

-- 6. Admin commission settings
CREATE TABLE commission_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    commission_percent NUMERIC(5,2) NOT NULL
        CHECK (commission_percent IN (5, 10, 15, 20)),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO commission_settings (id, commission_percent)
VALUES (1, 5);

-- 7. Platform wallet
CREATE TABLE platform_wallet (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_wallet (id, balance)
VALUES (1, 0);

-- 8. Platform wallet ledger
CREATE TABLE platform_wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    amount BIGINT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(30) NOT NULL,
    reference_id BIGINT,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_wallet_transactions_created
    ON platform_wallet_transactions(created_at DESC);