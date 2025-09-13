package com.clanboards.messages.graphql;

/**
 * Union type for sendMessage results. Can be either a successful Message or a ModerationResponse
 * indicating why the message was blocked.
 */
public sealed interface SendMessageResult
    permits SendMessageResult.Success, SendMessageResult.Moderated {

  record Success(Message message) implements SendMessageResult {}

  record Moderated(ModerationResponse moderation) implements SendMessageResult {}

  static SendMessageResult success(Message message) {
    return new Success(message);
  }

  static SendMessageResult moderated(ModerationResponse moderation) {
    return new Moderated(moderation);
  }
}
