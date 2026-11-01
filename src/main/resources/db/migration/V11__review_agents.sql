CREATE TABLE review_agents (
    id BIGSERIAL PRIMARY KEY,
    agent_code VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT review_agents_kind_check CHECK (kind IN ('APPROVAL', 'WITHDRAW'))
);

CREATE TABLE review_actions (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES review_agents (id),
    kind VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    public_id VARCHAR(20) NOT NULL,
    player_name VARCHAR(40) NOT NULL,
    amount BIGINT NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT review_actions_kind_check CHECK (kind IN ('DEPOSIT', 'WITHDRAWAL')),
    CONSTRAINT review_actions_action_check CHECK (action IN ('APPROVE', 'REJECT'))
);

CREATE INDEX review_actions_kind_created_idx ON review_actions (kind, created_at DESC);
