CREATE TABLE anger_button_setting (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    label VARCHAR(32) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO anger_button_setting (id, label)
VALUES (1, 'LET IT OUT');

CREATE TABLE anger_button_user (
    user_id BIGINT PRIMARY KEY REFERENCES users (id),
    label VARCHAR(32) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
