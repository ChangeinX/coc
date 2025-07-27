package com.clanboards.users.service;

import com.clanboards.users.exception.InvalidRequestException;
import com.clanboards.users.exception.ResourceNotFoundException;
import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.FriendRequestRepository;
import com.clanboards.users.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FriendService {
  private final FriendRequestRepository repo;
  private final UserRepository userRepo;
  private static final Logger logger = LoggerFactory.getLogger(FriendService.class);

  public FriendService(FriendRequestRepository repo, UserRepository userRepo) {
    this.repo = repo;
    this.userRepo = userRepo;
  }

  public String getPlayerTag(Long userId) {
    return userRepo.findById(userId).map(User::getPlayerTag).orElse(null);
  }

  public String getSub(Long userId) {
    return userRepo.findById(userId).map(User::getSub).orElse(null);
  }

  public Long sendRequest(String fromSub, String toTag) {
    logger.info("Requesting friend from {} to {}", fromSub, toTag);
    Long fromUserId =
        userRepo
            .findBySub(fromSub)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + fromSub))
            .getId();
    Long toUserId =
        userRepo
            .findByPlayerTag(toTag)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + toTag))
            .getId();
    if (fromUserId.equals(toUserId)) {
      throw new InvalidRequestException("Cannot send friend request to yourself");
    }
    List<FriendRequest> existing = repo.findBetweenUsers(fromUserId, toUserId);
    for (FriendRequest r : existing) {
      if (!"REJECTED".equals(r.getStatus()) || r.getFromUserId().equals(fromUserId)) {
        switch (r.getStatus()) {
          case "PENDING" -> throw new InvalidRequestException("Friend request already pending");
          case "ACCEPTED" -> throw new InvalidRequestException("You are already friends");
          case "REJECTED" -> throw new InvalidRequestException("Friend request was rejected");
        }
      }
    }
    FriendRequest req = new FriendRequest();
    req.setFromUserId(fromUserId);
    req.setToUserId(toUserId);
    req.setStatus("PENDING");
    return repo.save(req).getId();
  }

  public boolean respond(Long requestId, boolean accept) {
    logger.info("Responding to request {} accept={}", requestId, accept);
    FriendRequest req =
        repo.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));
    if (accept) {
      req.setStatus("ACCEPTED");
    } else {
      req.setStatus("REJECTED");
    }
    repo.save(req);
    return accept;
  }

  public List<FriendRequest> listRequests(String toSub) {
    logger.info("Listing requests for {}", toSub);
    Long userId =
        userRepo
            .findBySub(toSub)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + toSub))
            .getId();
    return repo.findByToUserIdAndStatus(userId, "PENDING");
  }

  public List<FriendDto> listFriends(String sub) {
    logger.info("Listing friends for {}", sub);
    Long userId =
        userRepo
            .findBySub(sub)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + sub))
            .getId();
    List<FriendRequest> records = repo.findFriends(userId, "ACCEPTED");
    return records.stream()
        .map(
            r -> {
              Long other = r.getFromUserId().equals(userId) ? r.getToUserId() : r.getFromUserId();
              return new FriendDto(getSub(other), getPlayerTag(other), r.getCreatedAt());
            })
        .toList();
  }

  public boolean removeFriend(String fromSub, String toTag) {
    logger.info("Removing friend from {} to {}", fromSub, toTag);
    Long fromUserId =
        userRepo
            .findBySub(fromSub)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + fromSub))
            .getId();
    Long toUserId =
        userRepo
            .findByPlayerTag(toTag)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + toTag))
            .getId();
    List<FriendRequest> records = repo.findFriends(fromUserId, "ACCEPTED");
    for (FriendRequest r : records) {
      if (r.getFromUserId().equals(toUserId) || r.getToUserId().equals(toUserId)) {
        repo.delete(r);
        return true;
      }
    }
    return false;
  }

  public record FriendDto(String userId, String playerTag, java.time.Instant since) {}
}
