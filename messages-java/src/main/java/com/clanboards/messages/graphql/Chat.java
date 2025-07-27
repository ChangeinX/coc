package com.clanboards.messages.graphql;

import java.time.Instant;
import java.util.List;

public record Chat(
    String id,
    ChatKind kind,
    String name,
    List<String> members,
    Instant createdAt,
    Message lastMessage) {}
