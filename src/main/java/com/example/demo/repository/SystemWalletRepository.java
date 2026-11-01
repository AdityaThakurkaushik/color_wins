package com.example.demo.repository;

import com.example.demo.entity.SystemWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface SystemWalletRepository extends JpaRepository<SystemWallet, Short> {
    Optional<SystemWallet> findByWalletType(String walletType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM SystemWallet w WHERE w.walletType = :type")
    Optional<SystemWallet> findByTypeForUpdate(@Param("type") String type);
}