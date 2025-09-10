package com.clanboards.notifications.service;

import com.clanboards.notifications.repository.InviteRepository;
import com.clanboards.notifications.repository.entity.Invite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InviteService {

  private static final Logger log = LoggerFactory.getLogger(InviteService.class);
  private final InviteRepository inviteRepository;
  private final NotificationService notificationService;

  @Autowired
  public InviteService(InviteRepository inviteRepository, NotificationService notificationService) {
    this.inviteRepository = inviteRepository;
    this.notificationService = notificationService;
  }

  public void sendInvite(Long fromUserId, Long toUserId) {
    log.info("Sending invite from user {} to user {}", fromUserId, toUserId);

    // Create and save invite record
    Invite invite = new Invite(fromUserId, toUserId);
    inviteRepository.save(invite);

    // Send push notification to the recipient
    try {
      notificationService.sendInvite(toUserId, "You have received a clan invite!");
      log.info("Successfully sent invite notification to user {}", toUserId);
    } catch (Exception e) {
      log.warn("Failed to send invite notification to user {}: {}", toUserId, e.getMessage());
      // Don't fail the entire invite process if notification fails
    }

    log.info("Invite successfully created from user {} to user {}", fromUserId, toUserId);
  }
}
