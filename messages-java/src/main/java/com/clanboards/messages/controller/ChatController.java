package com.clanboards.messages.controller;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/publish")
    public ResponseEntity<Map<String, String>> publish(@RequestBody PublishRequest req) {
        ChatMessage msg = chatService.publish(req.chatId(), req.text(), req.userId());
        return ResponseEntity.ok(Map.of("status", "ok", "ts", msg.ts().toString()));
    }

    @PostMapping("/publish/global")
    public ResponseEntity<Map<String, String>> publishGlobal(@RequestBody GlobalRequest req) {
        ChatMessage msg = chatService.publishGlobal(req.text(), req.userId());
        return ResponseEntity.ok(Map.of("status", "ok", "ts", msg.ts().toString()));
    }

    @GetMapping("/history/{chatId}")
    public ResponseEntity<List<Map<String, String>>> history(
            @PathVariable String chatId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String before) {
        List<ChatMessage> msgs = chatService.history(
                chatId,
                Math.min(limit, 100),
                before != null ? Instant.parse(before) : null
        );
        List<Map<String, String>> body = msgs.stream()
                .map(m -> Map.of(
                        "userId", m.userId(),
                        "content", m.content(),
                        "ts", m.ts().toString()))
                .toList();
        return ResponseEntity.ok(body);
    }

    public static record PublishRequest(String chatId, String text, String userId) {}
    public static record GlobalRequest(String text, String userId) {}
}
