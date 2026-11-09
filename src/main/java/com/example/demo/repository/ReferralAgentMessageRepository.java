package com.example.demo.repository;

import com.example.demo.entity.ReferralAgentMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferralAgentMessageRepository extends JpaRepository<ReferralAgentMessage, Long> {

    List<ReferralAgentMessage> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    long countByAgentIdAndAcknowledgedFalse(Long agentId);

    Optional<ReferralAgentMessage> findByIdAndAgentId(Long id, Long agentId);

    void deleteByAgentId(Long agentId);
}