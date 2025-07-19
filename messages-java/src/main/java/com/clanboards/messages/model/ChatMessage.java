package com.clanboards.messages.model;

import java.time.Instant;

public record ChatMessage(String channel, String userId, String content, Instant ts) {}
