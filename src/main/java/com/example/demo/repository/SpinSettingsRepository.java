package com.example.demo.repository;

import com.example.demo.entity.SpinSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SpinSettingsRepository extends JpaRepository<SpinSettings, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SpinSettings s WHERE s.id = :id")
    Optional<SpinSettings> findByIdForUpdate(@Param("id") Short id);
}
