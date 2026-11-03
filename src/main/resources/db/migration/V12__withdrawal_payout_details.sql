ALTER TABLE withdrawals
    ADD COLUMN payout_method VARCHAR(10),
    ADD COLUMN account_holder_name VARCHAR(512),
    ADD COLUMN upi_id VARCHAR(512),
    ADD COLUMN bank_name VARCHAR(512),
    ADD COLUMN bank_account_number VARCHAR(512),
    ADD COLUMN bank_ifsc VARCHAR(512);

ALTER TABLE withdrawals
    ADD CONSTRAINT withdrawals_payout_method_check
    CHECK (payout_method IS NULL OR payout_method IN ('UPI', 'BANK'));
