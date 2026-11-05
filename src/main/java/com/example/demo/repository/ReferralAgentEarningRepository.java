package com.example.demo.repository;

import com.example.demo.entity.ReferralAgentEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReferralAgentEarningRepository extends JpaRepository<ReferralAgentEarning, Long> {

    Optional<ReferralAgentEarning> findByIdempotencyKey(String idempotencyKey);

    List<ReferralAgentEarning> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    long countByAgentId(Long agentId);

    @Query("""
        SELECT COALESCE(SUM(e.coins), 0)
        FROM ReferralAgentEarning e
        WHERE e.agent.id = :agentId
        """)
    long sumCoinsByAgentId(@Param("agentId") Long agentId);

    @Query("""
        SELECT COALESCE(SUM(e.coins), 0)
        FROM ReferralAgentEarning e
        WHERE e.agent.id = :agentId
          AND e.kind = :kind
        """)
    long sumCoinsByAgentIdAndKind(@Param("agentId") Long agentId, @Param("kind") String kind);
}
