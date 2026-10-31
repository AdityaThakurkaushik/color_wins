
package com.example.demo.repository;

import com.example.demo.entity.NotificationRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRecipientRepository
        extends JpaRepository<NotificationRecipient, Long> {

    // User notification history with pagination.
    Page<NotificationRecipient>
findByUserIdAndNotificationActiveTrueOrderByCreatedAtDesc(
        Long userId,
        Pageable pageable
);

    // Find a notification belonging to the authenticated user.
    Optional<NotificationRecipient> findByIdAndUserId(
            Long id,
            Long userId
    );

    // Count unread notifications.
    long countByUserIdAndNotificationActiveTrueAndReadFalse(Long userId);

    // Mark all unread notifications as read.
    @Modifying
    @Query("""
        UPDATE NotificationRecipient nr
        SET nr.read = true,
            nr.readAt = CURRENT_TIMESTAMP
     WHERE nr.user.id = :userId
  AND nr.read = false
  AND nr.notification.active = true
    """)
    int markAllAsRead(@Param("userId") Long userId);

    // Check whether a user already received a notification.
    boolean existsByNotificationIdAndUserId(
            Long notificationId,
            Long userId
    );
}
