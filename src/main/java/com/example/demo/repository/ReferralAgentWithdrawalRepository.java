package com.example.demo.repository;

import com.example.demo.entity.ReferralAgentWithdrawal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReferralAgentWithdrawalRepository extends JpaRepository<ReferralAgentWithdrawal, Long> {

    List<ReferralAgentWithdrawal> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    List<ReferralAgentWithdrawal> findByStatusOrderByCreatedAtAsc(String status);

    void deleteByAgentId(Long agentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM ReferralAgentWithdrawal w WHERE w.id = :id")
    Optional<ReferralAgentWithdrawal> findByIdForUpdate(@Param("id") Long id);
}
