package com.clanboards.messages.graphql;

/**
 * Represents the result of a moderation check on a message. Used when a message cannot be posted
 * due to moderation policies.
 */
public record ModerationResponse(ModerationAction action, String reason, Integer durationMinutes) {

  public enum ModerationAction {
    WARNING,
    MUTED,
    BANNED,
    READONLY
  }

  /** Creates a warning response for toxicity detection. */
  public static ModerationResponse warning(String reason) {
    return new ModerationResponse(ModerationAction.WARNING, reason, null);
  }

  /** Creates a mute response with duration. */
  public static ModerationResponse muted(String reason, int durationMinutes) {
    return new ModerationResponse(ModerationAction.MUTED, reason, durationMinutes);
  }

  /** Creates a ban response. */
  public static ModerationResponse banned(String reason) {
    return new ModerationResponse(ModerationAction.BANNED, reason, null);
  }

  /** Creates a readonly response. */
  public static ModerationResponse readonly(String reason) {
    return new ModerationResponse(ModerationAction.READONLY, reason, null);
  }
}
