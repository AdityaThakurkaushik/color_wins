
package com.example.demo.repository;

import com.example.demo.entity.Bet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BetRepository extends JpaRepository<Bet, Long> {

    List<Bet> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Bet> findByRoundId(Long roundId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bet b WHERE b.round.id = :roundId ORDER BY b.id")
    List<Bet> findByRoundIdForUpdate(@Param("roundId") Long roundId);





    @Query("""
    SELECT COALESCE(SUM(b.amount), 0)
    FROM Bet b
    WHERE b.round.id = :roundId
      AND b.selectedColor = :color
      AND b.status = 'PENDING'
    """)
Long sumPendingAmountByRoundAndColor(
        @Param("roundId") Long roundId,
        @Param("color") String color);

@Query("""
    SELECT COUNT(DISTINCT b.user.id)
    FROM Bet b
    WHERE b.round.id = :roundId
      AND b.selectedColor = :color
      AND b.status = 'PENDING'
    """)
Long countPendingPlayersByRoundAndColor(
        @Param("roundId") Long roundId,
        @Param("color") String color);
}
