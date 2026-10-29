-- Persist global ColorWin game control state.
-- Preserve current behavior by starting in RUNNING state.

CREATE TABLE game_control (
    id SMALLINT PRIMARY KEY CHECK (id = 1),

    state VARCHAR(20) NOT NULL
        CHECK (state IN ('RUNNING', 'PAUSED', 'STOPPING', 'STOPPED')),

    paused_remaining_seconds BIGINT,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (state = 'PAUSED'
            AND paused_remaining_seconds IS NOT NULL
            AND paused_remaining_seconds >= 0)
        OR
        (state <> 'PAUSED'
            AND paused_remaining_seconds IS NULL)
    )
);

INSERT INTO game_control (
    id,
    state,
    paused_remaining_seconds
)
VALUES (
    1,
    'RUNNING',
    NULL
);