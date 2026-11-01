package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = "app.jwt.secret=test-only-secret-with-at-least-32-bytes")
@Transactional
class SettlementMigrationIntegrationTest {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void migrationAllowsCancelledBetsRefundLedgerAndCancelledSettlement() {
        String suffix = UUID.randomUUID().toString();
        Long userId = jdbcTemplate.queryForObject("""
                INSERT INTO users (username, email, mobile_number, password_hash)
                VALUES (?, ?, ?, 'test-hash') RETURNING id
                """, Long.class, "m-" + suffix.replace("-", "").substring(0, 12),
                suffix + "@example.test", "9" + suffix.replace("-", "").substring(0, 9));
        Long roundId = jdbcTemplate.queryForObject("""
                INSERT INTO game_rounds (
                    period_number, status, starts_at, ends_at, result_number, result_color,
                    settlement_status, total_pool, commission_amount, winning_pool, settled_at
                ) VALUES (?, 'CANCELLED', CURRENT_TIMESTAMP - INTERVAL '2 minutes',
                    CURRENT_TIMESTAMP - INTERVAL '1 minute', 1, 'RED', 'CANCELLED',
                    50, 0, 0, CURRENT_TIMESTAMP) RETURNING id
                """, Long.class, "MIGRATION-" + suffix.replace("-", "").substring(0, 12));

        jdbcTemplate.update("""
                INSERT INTO bets (user_id, round_id, selection_type, selected_color,
                    amount, status, points_payout)
                VALUES (?, ?, 'COLOR', 'RED', 50, 'CANCELLED', 50)
                """, userId, roundId);
        jdbcTemplate.update("""
                INSERT INTO points_transactions (user_id, amount, transaction_type, idempotency_key)
                VALUES (?, 50, 'BET_REFUND', ?)
                """, userId, "MIGRATION_REFUND_" + suffix);

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bets WHERE round_id = ? AND status = 'CANCELLED'",
                Integer.class, roundId));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM points_transactions WHERE user_id = ? AND transaction_type = 'BET_REFUND'",
                Integer.class, userId));
        assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                "SELECT status FROM game_rounds WHERE id = ?", String.class, roundId));
        assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                "SELECT settlement_status FROM game_rounds WHERE id = ?", String.class, roundId));
    }
}
