package com.clanboards.notifications.controller;

import com.clanboards.notifications.service.InviteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications/invites")
public class InviteController {

  private static final Logger log = LoggerFactory.getLogger(InviteController.class);
  private final InviteService inviteService;

  @Autowired
  public InviteController(InviteService inviteService) {
    this.inviteService = inviteService;
  }

  @PostMapping("/{toUserId}")
  public ResponseEntity<Void> sendInvite(
      @PathVariable Long toUserId,
      @RequestHeader(value = "X-User-Id", required = true) String fromUserIdHeader) {

    log.info("Received invite request to user {} from header {}", toUserId, fromUserIdHeader);

    Long fromUserId;
    try {
      fromUserId = Long.parseLong(fromUserIdHeader);
    } catch (NumberFormatException e) {
      log.warn("Invalid X-User-Id header value: {}", fromUserIdHeader);
      return ResponseEntity.badRequest().build();
    }

    try {
      inviteService.sendInvite(fromUserId, toUserId);
      log.info("Successfully processed invite from user {} to user {}", fromUserId, toUserId);
      return ResponseEntity.noContent().build();
    } catch (Exception e) {
      log.error(
          "Failed to send invite from user {} to user {}: {}",
          fromUserId,
          toUserId,
          e.getMessage());
      return ResponseEntity.internalServerError().build();
    }
  }
}
