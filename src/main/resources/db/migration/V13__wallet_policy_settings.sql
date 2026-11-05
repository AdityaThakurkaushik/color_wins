ALTER TABLE users
    ALTER COLUMN virtual_points SET DEFAULT 100;

CREATE TABLE platform_wallet_policy (
    id SMALLINT PRIMARY KEY,
    signup_bonus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    signup_bonus_amount BIGINT NOT NULL DEFAULT 100
        CHECK (signup_bonus_amount >= 0),
    first_withdrawal_check_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    first_withdrawal_min_deposits BIGINT NOT NULL DEFAULT 100
        CHECK (first_withdrawal_min_deposits >= 0),
    min_withdrawal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_withdrawal_amount BIGINT NOT NULL DEFAULT 200
        CHECK (min_withdrawal_amount >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_wallet_policy (
    id,
    signup_bonus_enabled,
    signup_bonus_amount,
    first_withdrawal_check_enabled,
    first_withdrawal_min_deposits,
    min_withdrawal_enabled,
    min_withdrawal_amount
) VALUES (1, TRUE, 100, TRUE, 100, TRUE, 200);

CREATE TABLE user_wallet_policy_override (
    user_id BIGINT PRIMARY KEY REFERENCES users (id),
    signup_bonus_enabled BOOLEAN,
    signup_bonus_amount BIGINT CHECK (signup_bonus_amount IS NULL OR signup_bonus_amount >= 0),
    first_withdrawal_check_enabled BOOLEAN,
    first_withdrawal_min_deposits BIGINT CHECK (first_withdrawal_min_deposits IS NULL OR first_withdrawal_min_deposits >= 0),
    min_withdrawal_enabled BOOLEAN,
    min_withdrawal_amount BIGINT CHECK (min_withdrawal_amount IS NULL OR min_withdrawal_amount >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platform_wallet_policy_audit (
    id BIGSERIAL PRIMARY KEY,
    actor_username VARCHAR(80) NOT NULL,
    target_user_id BIGINT REFERENCES users (id),
    setting_key VARCHAR(80) NOT NULL,
    old_value VARCHAR(80),
    new_value VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_policy_audit_created
    ON platform_wallet_policy_audit (created_at DESC);
