package com.example.demo.repository;

import com.example.demo.entity.Withdrawal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {

    List<Withdrawal> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Withdrawal> findByStatusOrderByCreatedAtAsc(String status);

    Optional<Withdrawal> findByPublicId(String publicId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Withdrawal w WHERE w.publicId = :publicId")
    Optional<Withdrawal> findByPublicIdForUpdate(@Param("publicId") String publicId);
}
