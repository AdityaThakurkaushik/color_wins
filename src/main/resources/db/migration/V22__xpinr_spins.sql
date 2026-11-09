CREATE TABLE spins (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    segment_index SMALLINT NOT NULL CHECK (segment_index BETWEEN 0 AND 9),
    multiplier NUMERIC(4, 2) NOT NULL CHECK (multiplier >= 0),
    payout BIGINT NOT NULL DEFAULT 0 CHECK (payout >= 0),
    net BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spins_user_created
    ON spins(user_id, created_at DESC);

ALTER TABLE points_transactions
    DROP CONSTRAINT IF EXISTS points_transactions_transaction_type_check;

ALTER TABLE points_transactions
    ADD CONSTRAINT points_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'SIGNUP_BONUS',
        'BET_DEBIT',
        'BET_PAYOUT',
        'BET_REFUND',
        'ADMIN_ADJUSTMENT',
        'ADMIN_CREDIT',
        'ADMIN_DEBIT',
        'REFERRAL_BONUS',
        'DEPOSIT_CREDIT',
        'WITHDRAWAL_DEBIT',
        'WITHDRAWAL_REFUND',
        'SPIN_DEBIT',
        'SPIN_PAYOUT'
    ));
