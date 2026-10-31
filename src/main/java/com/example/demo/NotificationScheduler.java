
package com.example.demo;

import com.example.demo.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationScheduler {

    private final NotificationService notificationService;

    public NotificationScheduler(
            NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelay = 9000)
    public void processScheduledNotifications() {
        try {
            notificationService.processScheduledNotifications();
        } catch (Exception ex) {
            System.err.println(
                    "Notification scheduler error: " + ex.getMessage()
            );
        }
    }
}
