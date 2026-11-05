package com.example.demo.repository;

import com.example.demo.entity.LeaderboardPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaderboardPlayerRepository extends JpaRepository<LeaderboardPlayer, Long> {

    List<LeaderboardPlayer> findAllByOrderBySlotNoAsc();

    Optional<LeaderboardPlayer> findBySlotNo(Integer slotNo);

    long count();
}
