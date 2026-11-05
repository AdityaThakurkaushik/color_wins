package com.example.demo.repository;

import com.example.demo.entity.ReferralAgent;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReferralAgentRepository extends JpaRepository<ReferralAgent, Long> {

    Optional<ReferralAgent> findByUsernameIgnoreCase(String username);

    Optional<ReferralAgent> findByAgentCodeIgnoreCase(String agentCode);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByAgentCodeIgnoreCase(String agentCode);

    List<ReferralAgent> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ReferralAgent a WHERE a.id = :id")
    Optional<ReferralAgent> findByIdForUpdate(@Param("id") Long id);
}
