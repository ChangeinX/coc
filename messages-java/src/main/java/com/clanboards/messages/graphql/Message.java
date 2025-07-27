package com.clanboards.messages.graphql;

import java.time.Instant;

public record Message(String id, String chatId, Instant ts, String senderId, String content) {}
