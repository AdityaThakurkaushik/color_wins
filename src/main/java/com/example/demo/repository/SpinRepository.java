package com.example.demo.repository;

import com.example.demo.entity.Spin;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpinRepository extends JpaRepository<Spin, Long> {

    List<Spin> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    List<Spin> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(s.amount), 0),
                   COALESCE(SUM(s.payout), 0),
                   COALESCE(SUM(s.net), 0),
                   COUNT(s)
            FROM Spin s
            """)
    Object[] aggregateTotals();

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.payout = 0 THEN 1 ELSE 0 END), 0),
                   COALESCE(SUM(CASE WHEN s.payout > 0 THEN 1 ELSE 0 END), 0)
            FROM Spin s
            """)
    Object[] aggregateWinLossCounts();
}
