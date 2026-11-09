ALTER TABLE referral_settings
    ADD COLUMN IF NOT EXISTS min_agent_balance BIGINT NOT NULL DEFAULT 0;

UPDATE referral_settings
SET min_agent_balance = COALESCE(min_agent_balance, 0)
WHERE id = 1;

ALTER TABLE referral_agents
    ADD COLUMN IF NOT EXISTS min_balance BIGINT;

ALTER TABLE referral_agents
    DROP CONSTRAINT IF EXISTS referral_agents_min_balance_check;
ALTER TABLE referral_agents
    ADD CONSTRAINT referral_agents_min_balance_check
        CHECK (min_balance IS NULL OR min_balance >= 0);

CREATE TABLE IF NOT EXISTS referral_agent_messages (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES referral_agents (id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_agent_messages_agent_created_idx
    ON referral_agent_messages (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_agent_messages_agent_unread_idx
    ON referral_agent_messages (agent_id, acknowledged, created_at DESC);
