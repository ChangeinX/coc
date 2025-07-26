package com.clanboards.notifications.service;

import com.clanboards.notifications.repository.PushSubscriptionRepository;
import com.clanboards.notifications.repository.entity.PushSubscription;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private final PushSubscriptionRepository repository;
    private final PushService pushService;

    public NotificationService(PushSubscriptionRepository repository, PushService pushService) {
        this.repository = repository;
        this.pushService = pushService;
    }

    public void subscribe(Long userId, PushSubscription sub) {
        sub.setUserId(userId);
        sub.setLastSeenAt(Instant.now());
        PushSubscription existing = repository.findByEndpoint(sub.getEndpoint());
        if (existing != null) {
            existing.setP256dhKey(sub.getP256dhKey());
            existing.setAuthKey(sub.getAuthKey());
            existing.setUserId(userId);
            existing.setLastSeenAt(Instant.now());
            repository.save(existing);
        } else {
            repository.save(sub);
        }
    }

    public void sendTest(Long userId, String payload) {
        List<PushSubscription> subs = repository.findByUserId(userId);
        for (PushSubscription sub : subs) {
            try {
                Notification notification = new Notification(sub.getEndpoint(), sub.getP256dhKey(), sub.getAuthKey(), payload.getBytes());
                pushService.send(notification);
                sub.setLastSeenAt(Instant.now());
                repository.save(sub);
            } catch (Exception e) {
                logger.warn("Failed to send notification", e);
                // TODO handle 404/410 cleanup
            }
        }
    }
}
