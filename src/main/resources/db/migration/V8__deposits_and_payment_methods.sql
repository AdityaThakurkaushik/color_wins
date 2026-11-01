CREATE TABLE payment_methods (
    id BIGSERIAL PRIMARY KEY,
    label VARCHAR(40) NOT NULL,
    upi_id VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deposits (
    id BIGSERIAL PRIMARY KEY,
    public_id VARCHAR(20) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    payment_method_id BIGINT NOT NULL REFERENCES payment_methods(id),
    amount_requested BIGINT NOT NULL CHECK (amount_requested > 0),
    amount_confirmed BIGINT CHECK (amount_confirmed IS NULL OR amount_confirmed > 0),
    utr VARCHAR(22) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED')),
    reject_reason VARCHAR(255),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposits_user_created ON deposits(user_id, created_at DESC);
CREATE INDEX idx_deposits_status ON deposits(status);

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
        'DEPOSIT_CREDIT'
    ));
