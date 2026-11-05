-- Signup profile fields + Gmail verification + OTP storage

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS state VARCHAR(60),
    ADD COLUMN IF NOT EXISTS age SMALLINT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing accounts stay usable.
UPDATE users
SET email_verified = TRUE
WHERE email_verified = FALSE;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_age_check;

ALTER TABLE users
    ADD CONSTRAINT users_age_check
    CHECK (age IS NULL OR (age >= 18 AND age <= 99));

CREATE TABLE email_otp (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL
        CHECK (purpose IN ('VERIFY', 'RESET')),
    code_hash VARCHAR(255) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX email_otp_email_purpose_idx
    ON email_otp (email, purpose, created_at DESC);
