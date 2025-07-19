package com.example.messages.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    @PostMapping("/publish")
    public ResponseEntity<Void> publish(@RequestBody PublishRequest req) {
        // TODO: persist message and broadcast via WebSocket
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history/{groupId}")
    public ResponseEntity<Void> history(@PathVariable String groupId) {
        // TODO: fetch messages
        return ResponseEntity.ok().build();
    }

    public static record PublishRequest(String groupId, String text) {}
}
