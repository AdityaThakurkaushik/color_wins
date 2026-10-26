
package com.example.demo.repository;

import com.example.demo.entity.PointsTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PointsTransactionRepository
        extends JpaRepository<PointsTransaction, Long> {

    List<PointsTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<PointsTransaction> findByIdempotencyKey(String idempotencyKey);
}
