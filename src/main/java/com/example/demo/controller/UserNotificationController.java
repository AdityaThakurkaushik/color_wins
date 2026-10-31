
package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.NotificationService;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/notifications")
public class UserNotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public UserNotificationController(
            NotificationService notificationService,
            UserRepository userRepository) {

        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // Get current authenticated user.
    private User getCurrentUser(Authentication authentication) {

        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));
    }

    // Get current user's notification history.
    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid pagination values");
        }

        User user = getCurrentUser(authentication);

        return ResponseEntity.ok(
                notificationService.getUserNotifications(
                        user.getId(), page, size
                )
        );
    }

    // Get unread notification count.
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        return ResponseEntity.ok(Map.of(
                "unreadCount",
                notificationService.getUnreadCount(user.getId())
        ));
    }

    // Mark one notification as read.
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        notificationService.markAsRead(id, user.getId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification marked as read"
        ));
    }

    // Mark all notifications as read.
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        int updated = notificationService.markAllAsRead(user.getId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "updatedCount", updated
        ));
    }
}
