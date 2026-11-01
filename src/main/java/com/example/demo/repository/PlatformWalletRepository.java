package com.example.demo.repository;

import com.example.demo.entity.PlatformWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlatformWalletRepository
        extends JpaRepository<PlatformWallet, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PlatformWallet p WHERE p.id = :id")
    Optional<PlatformWallet> findByIdForUpdate(@Param("id") Short id);
}