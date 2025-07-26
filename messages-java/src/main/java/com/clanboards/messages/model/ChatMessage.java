package com.clanboards.messages.model;

import java.time.Instant;

/**
 * Chat message stored in DynamoDB and returned via GraphQL.
 */
public record ChatMessage(
        String id,
        String channel,
        String userId,
        String content,
        Instant ts
) {}
