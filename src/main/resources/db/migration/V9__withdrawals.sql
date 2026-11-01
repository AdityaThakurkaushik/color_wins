CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,
    public_id VARCHAR(20) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
    reject_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_user_created ON withdrawals(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

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
        'WITHDRAWAL_REFUND'
    ));
