
-- Main notification table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,

    priority VARCHAR(15) NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('NORMAL', 'IMPORTANT', 'CRITICAL')),

    target_type VARCHAR(10) NOT NULL
        CHECK (target_type IN ('ALL', 'USER')),

    target_user_id BIGINT REFERENCES users(id),

    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,

    status VARCHAR(15) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'PUBLISHED')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_notification_target
        CHECK (
            (target_type = 'ALL' AND target_user_id IS NULL)
            OR
            (target_type = 'USER' AND target_user_id IS NOT NULL)
        )
);

-- Individual notification status for each user
CREATE TABLE notification_recipients (
    id BIGSERIAL PRIMARY KEY,

    notification_id BIGINT NOT NULL
        REFERENCES notifications(id) ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_notification_recipient
        UNIQUE (notification_id, user_id)
);

-- Indexes for faster queries
CREATE INDEX idx_notifications_status_schedule
    ON notifications(status, scheduled_at);

CREATE INDEX idx_notifications_active
    ON notifications(is_active);

CREATE INDEX idx_notification_recipients_user
    ON notification_recipients(user_id, created_at DESC);

CREATE INDEX idx_notification_recipients_unread
    ON notification_recipients(user_id, is_read);
