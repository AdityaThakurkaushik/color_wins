
package com.example.demo.service;

import com.example.demo.dto.NotificationRequest;
import com.example.demo.entity.Notification;
import com.example.demo.entity.NotificationRecipient;
import com.example.demo.entity.User;
import com.example.demo.repository.NotificationRecipientRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationRecipientRepository recipientRepository,
            UserRepository userRepository) {

        this.notificationRepository = notificationRepository;
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
    }

    // Create notification now or schedule it for later.
    @Transactional
    public Notification createNotification(NotificationRequest request) {

        validateRequest(request);

        Notification notification = new Notification();
        notification.setTitle(request.getTitle().trim());
        notification.setMessage(request.getMessage().trim());
        notification.setPriority(request.getPriority().toUpperCase());
        notification.setTargetType(request.getTargetType().toUpperCase());
        notification.setActive(
                request.getActive() == null || request.getActive()
        );
        notification.setScheduledAt(request.getScheduledAt());

        if ("USER".equals(notification.getTargetType())) {
            User user = userRepository.findById(request.getTargetUserId())
                    .orElseThrow(() ->
                            new IllegalArgumentException("Target user not found"));

            notification.setTargetUser(user);
        }

        notification.setStatus("SCHEDULED");

        Notification saved = notificationRepository.save(notification);

        // Publish immediately if scheduled time has already arrived.
        if (!saved.getScheduledAt().isAfter(OffsetDateTime.now())) {
            publishNotification(saved);
        }

        return saved;
    }

    // Publish all notifications whose scheduled time has arrived.
    @Transactional
    public void processScheduledNotifications() {

        var dueNotifications =
                notificationRepository
                        .findByStatusAndActiveTrueAndScheduledAtLessThanEqual(
                                "SCHEDULED",
                                OffsetDateTime.now()
                        );

        for (Notification notification : dueNotifications) {
            publishNotification(notification);
        }
    }

    // Create individual recipient records and publish notification.
    private void publishNotification(Notification notification) {

        if (!"SCHEDULED".equals(notification.getStatus())
                || !Boolean.TRUE.equals(notification.getActive())) {
            return;
        }

        if ("ALL".equals(notification.getTargetType())) {

            Pageable pageable = PageRequest.of(0, 500);
            Page<User> users;

            do {
                users = userRepository.searchUsers(null, pageable);

                for (User user : users.getContent()) {
                    if (!recipientRepository.existsByNotificationIdAndUserId(
                            notification.getId(), user.getId())) {

                        NotificationRecipient recipient =
                                new NotificationRecipient();

                        recipient.setNotification(notification);
                        recipient.setUser(user);
                        recipient.setRead(false);

                        recipientRepository.save(recipient);
                    }
                }

                pageable = users.nextPageable();

            } while (users.hasNext());

        } else if ("USER".equals(notification.getTargetType())) {

            User user = notification.getTargetUser();

            if (user == null) {
                throw new IllegalStateException(
                        "Target user is missing for notification "
                                + notification.getId()
                );
            }

            if (!recipientRepository.existsByNotificationIdAndUserId(
                    notification.getId(), user.getId())) {

                NotificationRecipient recipient =
                        new NotificationRecipient();

                recipient.setNotification(notification);
                recipient.setUser(user);
                recipient.setRead(false);

                recipientRepository.save(recipient);
            }

        } else {
            throw new IllegalStateException("Invalid notification target");
        }

        notification.setPublishedAt(OffsetDateTime.now());
        notification.setStatus("PUBLISHED");
        notificationRepository.save(notification);
    }

    // Get notification history for a user.
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getUserNotifications(
            Long userId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        return recipientRepository
                .findByUserIdAndNotificationActiveTrueOrderByCreatedAtDesc(
        userId, pageable
)
                .map(this::toUserResponse);
    }

   // Get unread notification count.
@Transactional(readOnly = true)
public long getUnreadCount(Long userId) {
    return recipientRepository
            .countByUserIdAndNotificationActiveTrueAndReadFalse(userId);
}
    // Mark one notification as read.
    @Transactional
    public void markAsRead(Long recipientId, Long userId) {

        NotificationRecipient recipient =
                recipientRepository.findByIdAndUserId(recipientId, userId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Notification not found"
                                ));

        if (!Boolean.TRUE.equals(recipient.getRead())) {
            recipient.setRead(true);
            recipient.setReadAt(OffsetDateTime.now());
            recipientRepository.save(recipient);
        }
    }

    // Mark all notifications as read for current user.
    @Transactional
    public int markAllAsRead(Long userId) {
        return recipientRepository.markAllAsRead(userId);
    }

    // Admin notification history.
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAdminHistory(
            int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        return notificationRepository
                .findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toAdminResponse);
    }

    // Activate or deactivate a notification.
    @Transactional
    public void updateActiveStatus(Long notificationId, boolean active) {

        Notification notification =
                notificationRepository.findById(notificationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Notification not found"
                                ));

        notification.setActive(active);
        notificationRepository.save(notification);
    }

    private void validateRequest(NotificationRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }

        String priority = request.getPriority().toUpperCase();
        if (!priority.equals("NORMAL")
                && !priority.equals("IMPORTANT")
                && !priority.equals("CRITICAL")) {
            throw new IllegalArgumentException("Invalid notification priority");
        }

        String target = request.getTargetType().toUpperCase();
        if (!target.equals("ALL") && !target.equals("USER")) {
            throw new IllegalArgumentException("Invalid notification target");
        }

        if ("USER".equals(target)
                && request.getTargetUserId() == null) {
            throw new IllegalArgumentException("Target user ID is required");
        }

        if (request.getScheduledAt() == null) {
            throw new IllegalArgumentException("Scheduled time is required");
        }
    }

    private Map<String, Object> toUserResponse(
            NotificationRecipient recipient) {

        Notification notification = recipient.getNotification();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", recipient.getId());
        response.put("title", notification.getTitle());
        response.put("message", notification.getMessage());
        response.put("priority", notification.getPriority());
        response.put("isRead", recipient.getRead());
        response.put("readAt", recipient.getReadAt());
        response.put("publishedAt", notification.getPublishedAt());

        return response;
    }

    private Map<String, Object> toAdminResponse(
            Notification notification) {

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", notification.getId());
        response.put("title", notification.getTitle());
        response.put("message", notification.getMessage());
        response.put("priority", notification.getPriority());
        response.put("targetType", notification.getTargetType());
        response.put(
                "targetUserId",
                notification.getTargetUser() == null
                        ? null
                        : notification.getTargetUser().getId()
        );
        response.put("scheduledAt", notification.getScheduledAt());
        response.put("publishedAt", notification.getPublishedAt());
        response.put("status", notification.getStatus());
        response.put("active", notification.getActive());
        response.put("createdAt", notification.getCreatedAt());

        return response;
    }
}
