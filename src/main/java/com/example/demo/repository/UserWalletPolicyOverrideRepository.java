package com.example.demo.repository;

import com.example.demo.entity.UserWalletPolicyOverride;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserWalletPolicyOverrideRepository extends JpaRepository<UserWalletPolicyOverride, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM UserWalletPolicyOverride o WHERE o.userId = :userId")
    Optional<UserWalletPolicyOverride> findByUserIdForUpdate(@Param("userId") Long userId);
}
