ALTER TABLE referral_agents
    ADD COLUMN IF NOT EXISTS first_deposit_percent NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS next_deposit_percent NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payout_note VARCHAR(200);

ALTER TABLE referral_agent_earnings
    ALTER COLUMN referred_user_id DROP NOT NULL;

ALTER TABLE referral_agent_earnings
    DROP CONSTRAINT IF EXISTS referral_agent_earnings_kind_check;

ALTER TABLE referral_agent_earnings
    ADD CONSTRAINT referral_agent_earnings_kind_check
        CHECK (kind IN ('SIGNUP', 'FIRST_DEPOSIT', 'NEXT_DEPOSIT', 'ADJUST'));

CREATE TABLE IF NOT EXISTS referral_agent_withdrawals (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES referral_agents (id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payout_method VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    upi_id VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(34),
    bank_ifsc VARCHAR(20),
    reject_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT referral_agent_withdrawals_status_check
        CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
    CONSTRAINT referral_agent_withdrawals_method_check
        CHECK (payout_method IN ('UPI', 'BANK'))
);

CREATE INDEX IF NOT EXISTS referral_agent_withdrawals_agent_created_idx
    ON referral_agent_withdrawals (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_agent_withdrawals_status_idx
    ON referral_agent_withdrawals (status, created_at ASC);
