package com.example.demo.repository;

import com.example.demo.entity.LeaderboardSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LeaderboardSettingsRepository extends JpaRepository<LeaderboardSettings, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LeaderboardSettings s WHERE s.id = :id")
    Optional<LeaderboardSettings> findByIdForUpdate(@Param("id") Short id);
}
