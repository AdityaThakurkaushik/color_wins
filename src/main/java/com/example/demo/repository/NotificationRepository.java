
package com.example.demo.repository;

import com.example.demo.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    // Find notifications whose scheduled time has arrived.
    List<Notification> findByStatusAndActiveTrueAndScheduledAtLessThanEqual(
            String status,
            OffsetDateTime scheduledAt
    );

    // Admin notification history, newest first.
    Page<Notification> findAllByOrderByCreatedAtDesc(
            Pageable pageable
    );

    // Find notifications targeted to a particular user or all users.
    @Query("""
        SELECT n FROM Notification n
        WHERE n.status = 'PUBLISHED'
          AND n.active = true
          AND (
              n.targetType = 'ALL'
              OR (n.targetType = 'USER' AND n.targetUser.id = :userId)
          )
        ORDER BY n.publishedAt DESC
    """)
    List<Notification> findVisibleForUser(
            @Param("userId") Long userId
    );
}
