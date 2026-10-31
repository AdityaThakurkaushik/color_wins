
package com.example.demo.controller;

import com.example.demo.dto.NotificationRequest;
import com.example.demo.service.NotificationService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final NotificationService notificationService;

    public AdminNotificationController(
            NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // Create and schedule a notification.
    @PostMapping
    public ResponseEntity<?> createNotification(
            @Valid @RequestBody NotificationRequest request) {

        var notification =
                notificationService.createNotification(request);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification created successfully",
                "notificationId", notification.getId(),
                "status", notification.getStatus()
        ));
    }

    // Get notification history.
    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid pagination values");
        }

        return ResponseEntity.ok(
                notificationService.getAdminHistory(page, size)
        );
    }

    // Activate or deactivate a notification.
    @PutMapping("/{id}/active")
    public ResponseEntity<?> updateActiveStatus(
            @PathVariable Long id,
            @RequestParam boolean active) {

        notificationService.updateActiveStatus(id, active);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification status updated"
        ));
    }
}
