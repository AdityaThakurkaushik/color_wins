package com.example.demo.repository;

import com.example.demo.entity.PlatformWalletPolicy;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PlatformWalletPolicyRepository extends JpaRepository<PlatformWalletPolicy, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PlatformWalletPolicy p WHERE p.id = :id")
    Optional<PlatformWalletPolicy> findByIdForUpdate(@Param("id") Short id);
}
