package com.clanboards.users.service;

import com.clanboards.users.exception.ResourceNotFoundException;
import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.model.FriendshipItem;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.FriendRequestRepository;
import com.clanboards.users.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

@Service
public class FriendService {
    private final FriendRequestRepository repo;
    private final UserRepository userRepo;
    private final DynamoDbTable<FriendshipItem> table;
    private static final Logger logger = LoggerFactory.getLogger(FriendService.class);

    public FriendService(FriendRequestRepository repo, UserRepository userRepo, DynamoDbEnhancedClient client) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.table = client.table("chat-friends", TableSchema.fromBean(FriendshipItem.class));
    }

    public String getPlayerTag(Long userId) {
        return userRepo.findById(userId)
                .map(User::getPlayerTag)
                .orElse(null);
    }

    public Long sendRequest(String fromSub, String toTag) {
        logger.info("Requesting friend from {} to {}", fromSub, toTag);
        Long fromUserId = userRepo.findBySub(fromSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + fromSub))
                .getId();
        Long toUserId = userRepo.findByPlayerTag(toTag)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + toTag))
                .getId();
        FriendRequest req = new FriendRequest();
        req.setFromUserId(fromUserId);
        req.setToUserId(toUserId);
        req.setStatus("PENDING");
        return repo.save(req).getId();
    }

    public boolean respond(Long requestId, boolean accept) {
        logger.info("Responding to request {} accept={}", requestId, accept);
        FriendRequest req = repo.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));
        if (accept) {
            FriendshipItem a = new FriendshipItem();
            a.setPK("FRIEND#" + req.getFromUserId());
            a.setSK("USER#" + req.getToUserId());
            FriendshipItem b = new FriendshipItem();
            b.setPK("FRIEND#" + req.getToUserId());
            b.setSK("USER#" + req.getFromUserId());
            table.putItem(a);
            table.putItem(b);
            req.setStatus("ACCEPTED");
        } else {
            req.setStatus("REJECTED");
        }
        repo.save(req);
        return accept;
    }

    public List<FriendRequest> listRequests(String toSub) {
        logger.info("Listing requests for {}", toSub);
        Long userId = userRepo.findBySub(toSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + toSub))
                .getId();
        return repo.findByToUserIdAndStatus(userId, "PENDING");
    }
}
