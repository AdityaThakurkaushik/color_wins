package com.example.demo.repository;

import com.example.demo.entity.SystemWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemWalletTransactionRepository extends JpaRepository<SystemWalletTransaction, Long> {
    boolean existsByIdempotencyKey(String idempotencyKey);
}
