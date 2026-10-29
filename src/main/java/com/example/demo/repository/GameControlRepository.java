package com.example.demo.repository;

import com.example.demo.entity.GameControl;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameControlRepository
        extends JpaRepository<GameControl, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GameControl g WHERE g.id = :id")
    Optional<GameControl> findByIdForUpdate(@Param("id") Short id);
}