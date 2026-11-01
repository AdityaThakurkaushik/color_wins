package com.example.demo.repository;

import com.example.demo.entity.ReviewAgent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewAgentRepository extends JpaRepository<ReviewAgent, Long> {

    Optional<ReviewAgent> findByAgentCodeIgnoreCase(String agentCode);

    List<ReviewAgent> findByKindOrderByCreatedAtDesc(String kind);
}
