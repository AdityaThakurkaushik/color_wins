package com.example.demo.repository;

import com.example.demo.entity.PlatformWalletPolicyAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlatformWalletPolicyAuditRepository extends JpaRepository<PlatformWalletPolicyAudit, Long> {

    List<PlatformWalletPolicyAudit> findTop50ByOrderByCreatedAtDesc();
}
