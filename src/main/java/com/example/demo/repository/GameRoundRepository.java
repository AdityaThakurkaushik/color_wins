
package com.example.demo.repository;

import com.example.demo.entity.GameRound;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface GameRoundRepository extends JpaRepository<GameRound, Long> {

    Optional<GameRound> findByPeriodNumber(String periodNumber);

    Optional<GameRound> findFirstByStatusOrderByStartsAtDesc(String status);

    List<GameRound> findByStatusAndEndsAtLessThanEqual(
            String status, OffsetDateTime time);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM GameRound r WHERE r.id = :roundId")
    Optional<GameRound> findByIdForUpdate(@Param("roundId") Long roundId);

    long countByStatus(String status);
}
