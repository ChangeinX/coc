package com.clanboards.users.controller;

import com.clanboards.users.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {
    private final FriendService service;

    public FriendController(FriendService service) {
        this.service = service;
    }

    @PostMapping("/request")
    public ResponseEntity<Map<String, Long>> request(@RequestBody RequestPayload payload) {
        Long id = service.sendRequest(payload.fromSub(), payload.toTag());
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PostMapping("/respond")
    public ResponseEntity<Map<String, Boolean>> respond(@RequestBody RespondPayload payload) {
        boolean result = service.respond(payload.requestId(), payload.accept());
        return ResponseEntity.ok(Map.of("ok", result));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<PendingPayload>> list(@RequestParam String sub) {
        var list = service.listRequests(sub).stream()
                .map(r -> new PendingPayload(r.getId(), r.getFromUserId()))
                .toList();
        return ResponseEntity.ok(list);
    }

    public record RequestPayload(String fromSub, String toTag) {}
    public record RespondPayload(Long requestId, boolean accept) {}
    public record PendingPayload(Long id, Long fromUserId) {}
}
