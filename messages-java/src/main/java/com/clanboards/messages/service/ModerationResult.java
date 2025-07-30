package com.clanboards.messages.service;

/** Result of message moderation. */
public enum ModerationResult {
  ALLOW,
  WARNING,
  READONLY,
  MUTE,
  BLOCK
}
