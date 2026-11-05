CREATE TABLE leaderboard_settings (
    id SMALLINT PRIMARY KEY,
    rotation_hours INTEGER NOT NULL DEFAULT 24
        CHECK (rotation_hours IN (24, 48)),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leaderboard_settings (id, rotation_hours) VALUES (1, 24);

CREATE TABLE leaderboard_player (
    id BIGSERIAL PRIMARY KEY,
    slot_no INTEGER NOT NULL UNIQUE
        CHECK (slot_no BETWEEN 1 AND 30),
    display_name VARCHAR(40) NOT NULL,
    profile_image TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_player_slot ON leaderboard_player (slot_no);
