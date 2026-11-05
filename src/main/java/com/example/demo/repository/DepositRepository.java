package com.example.demo.repository;

import com.example.demo.entity.Deposit;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface DepositRepository extends JpaRepository<Deposit, Long> {

    Optional<Deposit> findByPublicId(String publicId);

    Optional<Deposit> findByUtr(String utr);

    List<Deposit> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Deposit> findByStatusOrderByCreatedAtAsc(String status);

    List<Deposit> findAllByOrderByCreatedAtDesc();

    long countByUserIdAndStatusIn(Long userId, List<String> statuses);

    List<Deposit> findByStatusAndExpiresAtBefore(String status, OffsetDateTime time);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Deposit d WHERE d.publicId = :publicId")
    Optional<Deposit> findByPublicIdForUpdate(@Param("publicId") String publicId);

    @Query("""
        SELECT COALESCE(SUM(d.amountConfirmed), 0)
        FROM Deposit d
        WHERE d.user.id = :userId
          AND d.status = 'APPROVED'
        """)
    long sumApprovedDeposits(@Param("userId") Long userId);
}
