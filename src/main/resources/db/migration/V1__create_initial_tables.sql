
-- Initial ColorWin database schema

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    virtual_points BIGINT NOT NULL DEFAULT 1000
        CHECK (virtual_points >= 0),
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_rounds (
    id BIGSERIAL PRIMARY KEY,
    period_number VARCHAR(40) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED', 'RESULT_DECLARED')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    result_number SMALLINT
        CHECK (result_number BETWEEN 0 AND 9),
    result_color VARCHAR(10)
        CHECK (result_color IN ('RED', 'GREEN', 'VIOLET')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (ends_at > starts_at),
    CHECK (
        (status <> 'RESULT_DECLARED')
        OR (result_number IS NOT NULL AND result_color IS NOT NULL)
    )
);

CREATE TABLE bets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    round_id BIGINT NOT NULL REFERENCES game_rounds(id),
    selection_type VARCHAR(10) NOT NULL
        CHECK (selection_type IN ('COLOR', 'NUMBER')),
    selected_color VARCHAR(10)
        CHECK (selected_color IN ('RED', 'GREEN', 'VIOLET')),
    selected_number SMALLINT
        CHECK (selected_number BETWEEN 0 AND 9),
    amount BIGINT NOT NULL CHECK (amount > 0),
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'WON', 'LOST')),
    points_payout BIGINT NOT NULL DEFAULT 0
        CHECK (points_payout >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (selection_type = 'COLOR'
            AND selected_color IS NOT NULL
            AND selected_number IS NULL)
        OR
        (selection_type = 'NUMBER'
            AND selected_number IS NOT NULL
            AND selected_color IS NULL)
    )
);

CREATE INDEX idx_bets_user_created
    ON bets(user_id, created_at DESC);

CREATE INDEX idx_bets_round
    ON bets(round_id);

CREATE TABLE points_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN (
            'SIGNUP_BONUS', 'BET_DEBIT', 'BET_PAYOUT', 'ADMIN_ADJUSTMENT'
        )),
    reference_id BIGINT,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_transactions_user_created
    ON points_transactions(user_id, created_at DESC);
