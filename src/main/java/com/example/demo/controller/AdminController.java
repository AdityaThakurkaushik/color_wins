package com.example.demo.controller;

import com.example.demo.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}