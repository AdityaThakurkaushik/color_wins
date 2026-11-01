package com.example.demo.repository;

import com.example.demo.entity.GameCommissionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameCommissionAuditLogRepository extends JpaRepository<GameCommissionAuditLog, Long> {}