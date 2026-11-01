package com.example.demo.repository;

import com.example.demo.entity.CommissionSetting;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommissionSettingRepository
        extends JpaRepository<CommissionSetting, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CommissionSetting c WHERE c.id = :id")
    Optional<CommissionSetting> findByIdForUpdate(@Param("id") Short id);
}