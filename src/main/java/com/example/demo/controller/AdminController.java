package com.example.demo.controller;

import com.example.demo.repository.BetRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final BetRepository betRepository;

    public AdminController(
            UserRepository userRepository,
            BetRepository betRepository) {
        this.userRepository = userRepository;
        this.betRepository = betRepository;
    }

    @GetMapping("/health")
    public Map<String, String> adminHealth() {
        return Map.of(
                "status", "ok",
                "message", "Admin authorization successful"
        );
    }

    @GetMapping("/stats/users")
    public Map<String, Long> getTotalUsers() {
        return Map.of(
                "totalUsers", userRepository.count()
        );
    }

    @GetMapping("/stats/virtual-points")
    public Map<String, Long> getTotalVirtualPoints() {
        long totalVirtualPoints = userRepository.findAll()
                .stream()
                .mapToLong(user -> user.getVirtualPoints())
                .sum();

        return Map.of(
                "totalVirtualPoints", totalVirtualPoints
        );
    }

    @GetMapping("/stats/bets")
    public Map<String, Long> getTotalBets() {
        return Map.of(
                "totalBets", betRepository.count()
        );
    }
}