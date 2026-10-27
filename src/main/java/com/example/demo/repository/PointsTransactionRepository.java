package com.example.demo.repository;

import com.example.demo.entity.PointsTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PointsTransactionRepository
        extends JpaRepository<PointsTransaction, Long> {

    List<PointsTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<PointsTransaction> findByIdempotencyKey(String idempotencyKey);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0)
        FROM PointsTransaction p
        WHERE p.user.id = :userId
          AND p.transactionType = 'REFERRAL_BONUS'
          AND p.idempotencyKey LIKE 'REFERRAL_REFERRER_%'
        """)
    Long sumReferralRewardsByUserId(@Param("userId") Long userId);
}