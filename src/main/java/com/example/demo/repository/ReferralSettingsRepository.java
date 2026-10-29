package com.example.demo.repository;

import com.example.demo.entity.ReferralSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReferralSettingsRepository
        extends JpaRepository<ReferralSettings, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReferralSettings r WHERE r.id = :id")
    Optional<ReferralSettings> findByIdForUpdate(
            @Param("id") Short id);
}