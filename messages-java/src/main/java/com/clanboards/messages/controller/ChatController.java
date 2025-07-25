package com.clanboards.messages.controller;

import com.clanboards.messages.model.ChatMessage;
import com.clanboards.messages.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/publish")
    public ResponseEntity<Map<String, String>> publish(@RequestBody PublishRequest req) {
        log.info("Received publish request for chat {}", req.chatId());
        ChatMessage msg = chatService.publish(req.chatId(), req.text(), req.userId());
        return ResponseEntity.ok(Map.of("status", "ok", "ts", msg.ts().toString()));
    }

    @PostMapping("/publish/global")
    public ResponseEntity<Map<String, String>> publishGlobal(@RequestBody GlobalRequest req) {
        log.info("Received global publish request by {}", req.userId());
        ChatMessage msg = chatService.publishGlobal(req.text(), req.userId());
        return ResponseEntity.ok(Map.of("status", "ok", "ts", msg.ts().toString()));
    }

    @GetMapping("/history/{chatId}")
    public ResponseEntity<List<Map<String, String>>> history(
            @PathVariable String chatId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String before) {
        log.debug("Requesting history for chat {}", chatId);
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
