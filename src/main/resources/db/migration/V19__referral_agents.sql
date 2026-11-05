ALTER TABLE referral_settings
    ADD COLUMN IF NOT EXISTS agent_first_deposit_percent NUMERIC(5, 2) NOT NULL DEFAULT 10;
ALTER TABLE referral_settings
    ADD COLUMN IF NOT EXISTS agent_next_deposit_percent NUMERIC(5, 2) NOT NULL DEFAULT 5;

UPDATE referral_settings
SET agent_first_deposit_percent = COALESCE(agent_first_deposit_percent, 10),
    agent_next_deposit_percent = COALESCE(agent_next_deposit_percent, 5)
WHERE id = 1;

CREATE TABLE referral_agents (
    id BIGSERIAL PRIMARY KEY,
    agent_code VARCHAR(30) NOT NULL UNIQUE,
    username VARCHAR(40) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(60),
    virtual_points BIGINT NOT NULL DEFAULT 0 CHECK (virtual_points >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX referral_agents_active_idx ON referral_agents (active);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referred_by_agent_id BIGINT REFERENCES referral_agents (id);

CREATE INDEX users_referred_by_agent_idx ON users (referred_by_agent_id);

CREATE TABLE referral_agent_earnings (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES referral_agents (id),
    referred_user_id BIGINT NOT NULL REFERENCES users (id),
    deposit_id BIGINT REFERENCES deposits (id),
    kind VARCHAR(30) NOT NULL,
    percent NUMERIC(5, 2),
    base_amount BIGINT NOT NULL DEFAULT 0,
    coins BIGINT NOT NULL CHECK (coins >= 0),
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT referral_agent_earnings_kind_check
        CHECK (kind IN ('SIGNUP', 'FIRST_DEPOSIT', 'NEXT_DEPOSIT'))
);

CREATE INDEX referral_agent_earnings_agent_created_idx
    ON referral_agent_earnings (agent_id, created_at DESC);
CREATE INDEX referral_agent_earnings_user_idx
    ON referral_agent_earnings (referred_user_id);
