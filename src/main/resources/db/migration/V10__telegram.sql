ALTER TABLE users ADD COLUMN telegram_id BIGINT;
CREATE UNIQUE INDEX users_telegram_id_key ON users (telegram_id);

CREATE TABLE telegram_link_tokens (
    token VARCHAR(48) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE TABLE telegram_chats (
    chat_id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users (id),
    pending_public_id VARCHAR(20)
);
