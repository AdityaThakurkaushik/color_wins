-- Permit refunding every stake when a single-player reward exceeds the
-- available Platform Wallet balance. Existing rows remain valid.

ALTER TABLE bets
    DROP CONSTRAINT bets_status_check,
    ADD CONSTRAINT chk_bets_status
        CHECK (status IN ('PENDING', 'WON', 'LOST', 'CANCELLED'));

ALTER TABLE points_transactions
    DROP CONSTRAINT points_transactions_transaction_type_check,
    ADD CONSTRAINT chk_points_transaction_type
        CHECK (transaction_type IN (
            'SIGNUP_BONUS', 'BET_DEBIT', 'BET_PAYOUT', 'BET_REFUND', 'ADMIN_ADJUSTMENT'
        ));

ALTER TABLE game_rounds
    DROP CONSTRAINT game_rounds_status_check,
    ADD CONSTRAINT chk_game_round_status
        CHECK (status IN ('OPEN', 'CLOSED', 'RESULT_DECLARED', 'CANCELLED'));

ALTER TABLE game_rounds
    DROP CONSTRAINT chk_game_round_settlement_status,
    ADD CONSTRAINT chk_game_round_settlement_status
        CHECK (settlement_status IN ('PENDING', 'SETTLED', 'CANCELLED'));
