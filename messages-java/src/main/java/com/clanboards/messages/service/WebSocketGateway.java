package com.clanboards.messages.service;

import com.clanboards.messages.events.MessageSavedEvent;
import com.clanboards.messages.model.ChatMessage;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class WebSocketGateway {
  private final SimpMessagingTemplate messaging;

  public WebSocketGateway(SimpMessagingTemplate messaging) {
    this.messaging = messaging;
  }

  @EventListener
  public void pushToChat(MessageSavedEvent event) {
    ChatMessage msg = event.message();
    messaging.convertAndSend(
        "/topic/chat/" + msg.channel(),
        Map.of(
            "channel", msg.channel(),
            "userId", msg.userId(),
            "content", msg.content(),
            "ts", msg.ts().toString()));
  }
}
