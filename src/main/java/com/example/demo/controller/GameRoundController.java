
package com.example.demo.controller;

import com.example.demo.repository.GameRoundRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameRoundController {

    private final GameRoundRepository gameRoundRepository;

    public GameRoundController(
            GameRoundRepository gameRoundRepository) {
        this.gameRoundRepository = gameRoundRepository;
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentRound() {

        return gameRoundRepository
                .findFirstByStatusOrderByStartsAtDesc("OPEN")
                .map(round -> ResponseEntity.ok(Map.of(
                        "periodNumber", round.getPeriodNumber(),
                        "status", round.getStatus(),
                        "startsAt", round.getStartsAt().toString(),
                        "endsAt", round.getEndsAt().toString()
                )))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/results")
    public List<Map<String, Object>> getRecentResults() {

        return gameRoundRepository
                .findTop10ByStatusOrderByStartsAtDesc("SETTLED")
                .stream()
                .map(round -> Map.<String, Object>of(
                        "periodNumber", round.getPeriodNumber(),
                        "resultNumber", round.getResultNumber(),
                        "resultColor", round.getResultColor(),
                        "status", round.getStatus()
                ))
                .toList();
    }
}