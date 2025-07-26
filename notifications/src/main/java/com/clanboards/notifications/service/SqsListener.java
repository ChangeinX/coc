package com.clanboards.notifications.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;

import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Component
public class SqsListener {
    private static final Logger logger = LoggerFactory.getLogger(SqsListener.class);
    private final SqsClient sqsClient = SqsClient.create();
    private final String queueUrl = System.getenv("OUTBOX_QUEUE_URL");

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
                sqsClient.deleteMessage(DeleteMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .receiptHandle(msg.receiptHandle())
                        .build());
            }
        } catch (Exception e) {
            logger.error("Error polling SQS", e);
        }
    }
}
