package com.example.demo.repository;

import com.example.demo.entity.PlatformWalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformWalletTransactionRepository
        extends JpaRepository<PlatformWalletTransaction, Long> {

    Optional<PlatformWalletTransaction> findByIdempotencyKey(
            String idempotencyKey
    );

    List<PlatformWalletTransaction> findAllByOrderByCreatedAtDesc();

    List<PlatformWalletTransaction> findByReferenceIdOrderByCreatedAtDesc(
            Long referenceId
    );
}