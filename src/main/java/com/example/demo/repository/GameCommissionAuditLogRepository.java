package com.example.demo.repository;

import com.example.demo.entity.GameCommissionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GameCommissionAuditLogRepository extends JpaRepository<GameCommissionAuditLog, Long> {
    List<GameCommissionAuditLog> findTop50ByOrderByChangedAtDesc();
}