package com.example.demo.controller;

import com.example.demo.entity.Bet;
import com.example.demo.entity.User;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.BetService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bets")
public class BetController {

    private final BetService betService;
    private final UserRepository userRepository;
    private final BetRepository betRepository;

    public BetController(
            BetService betService,
            UserRepository userRepository,
            BetRepository betRepository) {
        this.betService = betService;
        this.userRepository = userRepository;
        this.betRepository = betRepository;
    }

    public record PlaceColorBetRequest(
            @NotBlank String periodNumber,
            @NotBlank String color,
            @NotNull @Min(1) Long amount) {
    }

    @PostMapping
    public ResponseEntity<?> placeBet(
            @Valid @RequestBody PlaceColorBetRequest request,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "status", "ERROR",
                            "message", "Authentication required"
                    ));
        }

        User user = userRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        Bet bet = betService.placeColorBet(
                user.getId(),
                request.periodNumber(),
                request.color(),
                request.amount());

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Bet placed successfully",
                "betId", bet.getId(),
                "periodNumber", bet.getRound().getPeriodNumber(),
                "color", bet.getSelectedColor(),
                "amount", bet.getAmount(),
                "betStatus", bet.getStatus()
        ));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getColorSummary(
            @RequestParam String periodNumber,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(
                betService.getColorSummary(periodNumber)
        );
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyBets(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "status", "ERROR",
                            "message", "Authentication required"
                    ));
        }

        User user = userRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        List<Bet> bets = betRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId());

        List<Map<String, Object>> response = bets.stream()
                .map(bet -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("betId", bet.getId());
                    item.put("periodNumber",
                            bet.getRound().getPeriodNumber());
                    item.put("color", bet.getSelectedColor());
                    item.put("amount", bet.getAmount());
                    item.put("status", bet.getStatus());
                    item.put("pointsPayout", bet.getPointsPayout());
                    item.put("createdAt", bet.getCreatedAt());
                    return item;
                })
                .toList();

        return ResponseEntity.ok(response);
    }
}