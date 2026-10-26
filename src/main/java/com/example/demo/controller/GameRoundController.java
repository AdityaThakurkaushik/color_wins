
package com.example.demo.controller;

import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameRoundRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameRoundController {

    private final GameRoundRepository gameRoundRepository;

    public GameRoundController(GameRoundRepository gameRoundRepository) {
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
        return gameRoundRepository.findAll().stream()
                .filter(round -> "RESULT_DECLARED".equals(round.getStatus()))
                .sorted((a, b) -> b.getStartsAt().compareTo(a.getStartsAt()))
                .limit(10)
                .map(round -> Map.<String, Object>of(
                        "periodNumber", round.getPeriodNumber(),
                        "resultNumber", round.getResultNumber(),
                        "resultColor", round.getResultColor(),
                        "status", round.getStatus()
                ))
                .toList();
    }
}
