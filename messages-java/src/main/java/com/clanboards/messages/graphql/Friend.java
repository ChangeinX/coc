package com.clanboards.messages.graphql;

import java.time.Instant;

public record Friend(String userId, Instant since) {}
