CREATE TABLE referral_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    referrer_reward BIGINT NOT NULL DEFAULT 20
        CHECK (referrer_reward >= 0),
    referred_user_reward BIGINT NOT NULL DEFAULT 10
        CHECK (referred_user_reward >= 0),
    reward_condition VARCHAR(30) NOT NULL DEFAULT 'REGISTRATION',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO referral_settings (
    id,
    enabled,
    referrer_reward,
    referred_user_reward,
    reward_condition
)
VALUES (1, TRUE, 20, 10, 'REGISTRATION');