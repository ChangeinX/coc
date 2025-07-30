package com.clanboards.messages.service;

/** Result of moderation with categories. */
public record ModerationDetails(ModerationResult result, String categories) {}
