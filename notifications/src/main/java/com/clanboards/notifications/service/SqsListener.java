package com.clanboards.notifications.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import com.clanboards.notifications.repository.UserRepository;
import com.clanboards.notifications.repository.entity.User;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.ChangeMessageVisibilityRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.HashMap;

@Component
public class SqsListener {
    private static final Logger logger = LoggerFactory.getLogger(SqsListener.class);
    private final SqsClient sqsClient = SqsClient.create();
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String queueUrl = System.getenv("OUTBOX_QUEUE_URL");
    private final String dlqUrl = System.getenv("OUTBOX_DLQ_URL");

    public SqsListener(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void start() {
        if (queueUrl == null || queueUrl.isEmpty()) {
            logger.warn("OUTBOX_QUEUE_URL not configured; skipping SQS polling");
            return;
        }
        Executors.newSingleThreadScheduledExecutor().scheduleWithFixedDelay(this::poll, 0, 5, TimeUnit.SECONDS);
    }

    private void poll() {
        try {
            var messages = sqsClient.receiveMessage(ReceiveMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .waitTimeSeconds(20)
                    .maxNumberOfMessages(5)
                    .build()).messages();
            for (var msg : messages) {
                logger.info("Received message: {}", msg.body());
                boolean ok = false;
                try {
                    var node = mapper.readTree(msg.body());
                    String rawUser = node.path("userId").asText();
                    Long userId = null;
                    try {
                        userId = Long.parseLong(rawUser);
                    } catch (NumberFormatException ex) {
                        userId = userRepository.findBySub(rawUser)
                                .map(User::getId)
                                .orElse(null);
                    }
                    String payload = node.path("payload").asText();
                    logger.info("Processing notification for user {}", rawUser);
                    if (node.has("senderId")) {
                        String senderId = node.get("senderId").asText();
                        var map = new HashMap<String, String>();
                        map.put("title", "New message");
                        map.put("body", payload);
                        map.put("url", "/chat?user=" + senderId);
                        map.put("tag", "friend-" + senderId);
                        payload = mapper.writeValueAsString(map);
                    }
                    if (userId != null) {
                        ok = notificationService.sendNotification(userId, payload);
                    } else {
                        logger.warn("Unknown user {}", rawUser);
                    }
                } catch (Exception e) {
                    logger.error("Failed processing message", e);
                }

                if (ok) {
                    sqsClient.deleteMessage(DeleteMessageRequest.builder()
                            .queueUrl(queueUrl)
                            .receiptHandle(msg.receiptHandle())
                            .build());
                } else {
                    int receiveCount = Integer.parseInt(msg.attributes().getOrDefault("ApproximateReceiveCount", "1"));
                    if (receiveCount >= 5) {
                        if (dlqUrl != null && !dlqUrl.isEmpty()) {
                            sqsClient.sendMessage(SendMessageRequest.builder()
                                    .queueUrl(dlqUrl)
                                    .messageBody(msg.body())
                                    .build());
                        }
                        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                                .queueUrl(queueUrl)
                                .receiptHandle(msg.receiptHandle())
                                .build());
                    } else {
                        int delay = Math.min(900, (int) Math.pow(2, receiveCount) * 5);
                        sqsClient.changeMessageVisibility(ChangeMessageVisibilityRequest.builder()
                                .queueUrl(queueUrl)
                                .receiptHandle(msg.receiptHandle())
                                .visibilityTimeout(delay)
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error polling SQS", e);
        }
    }
}
