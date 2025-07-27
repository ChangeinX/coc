package com.clanboards.notifications.service;

import com.clanboards.notifications.repository.PushSubscriptionRepository;
import com.clanboards.notifications.repository.entity.PushSubscription;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
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
    private final Counter sentCounter;
    private final Counter errorCounter;
    private final Tracer tracer = GlobalOpenTelemetry.getTracer("notifications");

    public NotificationService(PushSubscriptionRepository repository, PushService pushService, MeterRegistry meterRegistry) {
        this.repository = repository;
        this.pushService = pushService;
        this.sentCounter = meterRegistry.counter("notifications.sent");
        this.errorCounter = meterRegistry.counter("notifications.errors");
    }

    public void subscribe(Long userId, PushSubscription sub, String oldEndpoint) {
        sub.setUserId(userId);
        sub.setLastSeenAt(Instant.now());
        if (oldEndpoint != null && !oldEndpoint.isEmpty()) {
            repository.deleteByEndpoint(oldEndpoint);
        }
        PushSubscription existing = repository.findByEndpoint(sub.getEndpoint());
        if (existing != null) {
            existing.setP256dhKey(sub.getP256dhKey());
            existing.setAuthKey(sub.getAuthKey());
            existing.setUserId(userId);
            existing.setLastSeenAt(Instant.now());
            repository.save(existing);
            logger.info("Updated subscription for user {}", userId);
        } else {
            repository.save(sub);
            logger.info("Created subscription for user {}", userId);
        }
    }

    public void sendTest(Long userId, String payload) {
        sendNotification(userId, payload);
    }

    public boolean sendNotification(Long userId, String payload) {
        Span span = tracer.spanBuilder("sendNotification").startSpan();
        try {
            List<PushSubscription> subs = repository.findByUserId(userId);
            boolean allOk = true;
            for (PushSubscription sub : subs) {
                try {
                    Notification notification = new Notification(
                            sub.getEndpoint(),
                            sub.getP256dhKey(),
                            sub.getAuthKey(),
                            payload.getBytes());
                    var response = pushService.send(notification);
                    int status = response.getStatusLine().getStatusCode();
                    if (status == 404 || status == 410) {
                        repository.delete(sub);
                        allOk = false;
                    } else if (status >= 200 && status < 300) {
                        sub.setLastSeenAt(Instant.now());
                        repository.save(sub);
                        sentCounter.increment();
                    } else {
                        logger.warn("Unexpected status {} sending notification", status);
                        errorCounter.increment();
                        allOk = false;
                    }
                } catch (Exception e) {
                    logger.warn("Failed to send notification", e);
                    errorCounter.increment();
                    allOk = false;
                }
            }
            return allOk;
        } finally {
            span.end();
        }
    }
}
