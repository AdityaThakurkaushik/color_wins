-- Add referral fields to existing users
ALTER TABLE users
    ADD COLUMN referral_code VARCHAR(30),
    ADD COLUMN referred_by_code VARCHAR(30);

-- Each user's referral code must be unique
CREATE UNIQUE INDEX uq_users_referral_code
    ON users(referral_code)
    WHERE referral_code IS NOT NULL;

-- Speed up lookups of users who joined through a referral
CREATE INDEX idx_users_referred_by_code
    ON users(referred_by_code);