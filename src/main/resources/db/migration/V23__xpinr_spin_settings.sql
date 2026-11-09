CREATE TABLE spin_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_bet BIGINT NOT NULL DEFAULT 5 CHECK (min_bet >= 5),
    max_bet BIGINT NOT NULL DEFAULT 10000 CHECK (max_bet >= min_bet),
    multipliers VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(60)
);

-- Default: 10 equal segments, RTP 80%, theoretical edge 20%
INSERT INTO spin_settings (id, enabled, min_bet, max_bet, multipliers, updated_by)
VALUES (
    1,
    TRUE,
    5,
    10000,
    '0,0,0,0,0,1.2,1.4,1.6,1.8,2.0',
    'system'
);
