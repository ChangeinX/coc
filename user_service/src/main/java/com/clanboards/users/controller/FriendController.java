package com.clanboards.users.controller;

import com.clanboards.users.service.FriendService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {
    private final FriendService service;
    private static final Logger logger = LoggerFactory.getLogger(FriendController.class);

    public FriendController(FriendService service) {
        this.service = service;
    }

    @PostMapping("/request")
    public ResponseEntity<Map<String, Long>> request(@RequestBody RequestPayload payload) {
        logger.info("POST /request from {} to {}", payload.fromSub(), payload.toTag());
        Long id = service.sendRequest(payload.fromSub(), payload.toTag());
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PostMapping("/respond")
    public ResponseEntity<Map<String, Boolean>> respond(@RequestBody RespondPayload payload) {
        logger.info("POST /respond id={} accept={}", payload.requestId(), payload.accept());
        boolean result = service.respond(payload.requestId(), payload.accept());
        return ResponseEntity.ok(Map.of("ok", result));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<PendingPayload>> list(@RequestParam String sub) {
        logger.info("GET /requests sub={}", sub);
        var list = service.listRequests(sub).stream()
                .map(r -> new PendingPayload(
                        r.getId(),
                        r.getFromUserId(),
                        service.getPlayerTag(r.getFromUserId())))
                .toList();
        return ResponseEntity.ok(list);
    }

    public record RequestPayload(String fromSub, String toTag) {}
    public record RespondPayload(Long requestId, boolean accept) {}
    public record PendingPayload(Long id, Long fromUserId, String playerTag) {}
}
