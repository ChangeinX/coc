package com.clanboards.messages.service;

import java.util.Map;

/** Moderation result with category scores. */
public record ModerationOutcome(ModerationResult result, Map<String, Double> categories) {}
