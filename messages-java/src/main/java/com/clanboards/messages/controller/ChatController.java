package com.clanboards.messages.controller;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messaging;
    public ChatController(ChatService chatService, SimpMessagingTemplate messaging) {
        this.chatService = chatService;
        this.messaging = messaging;
    }

    @PostMapping("/publish")
    public ResponseEntity<Map<String, String>> publish(@RequestBody PublishRequest req) {
        ChatMessage msg = chatService.publish(req.groupId(), req.text(), "0");
        messaging.convertAndSend("/topic/chat/" + req.groupId(), Map.of(
                "channel", msg.channel(),
                "userId", msg.userId(),
                "content", msg.content(),
                "ts", msg.ts().toString()
        ));
        return ResponseEntity.ok(Map.of("status", "ok", "ts", msg.ts().toString()));
    }

    @GetMapping("/history/{groupId}")
    public ResponseEntity<List<Map<String, String>>> history(
            @PathVariable String groupId,
            @RequestParam(defaultValue = "100") int limit) {
        List<ChatMessage> msgs = chatService.history(groupId, Math.min(limit, 100));
        List<Map<String, String>> body = msgs.stream()
                .map(m -> Map.of(
                        "userId", m.userId(),
                        "content", m.content(),
                        "ts", m.ts().toString()))
                .toList();
        return ResponseEntity.ok(body);
    }

    public static record PublishRequest(String groupId, String text) {}
}
