package com.example.demo.repository;

import com.example.demo.entity.ReviewAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewActionRepository extends JpaRepository<ReviewAction, Long> {

    Page<ReviewAction> findByKindOrderByCreatedAtDesc(String kind, Pageable pageable);
}
