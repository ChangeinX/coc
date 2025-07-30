package com.clanboards.messages.service;

/** Moderation result with category JSON. */
public record ModerationOutcome(ModerationResult result, String categories) {}
