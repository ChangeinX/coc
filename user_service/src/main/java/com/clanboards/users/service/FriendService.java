package com.clanboards.users.service;

import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.model.FriendshipItem;
import com.clanboards.users.repository.FriendRequestRepository;
import com.clanboards.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

@Service
public class FriendService {
    private final FriendRequestRepository repo;
    private final UserRepository userRepo;
    private final DynamoDbTable<FriendshipItem> table;

    public FriendService(FriendRequestRepository repo, UserRepository userRepo, DynamoDbEnhancedClient client) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.table = client.table("chat-friends", TableSchema.fromBean(FriendshipItem.class));
    }

    public Long sendRequest(String fromSub, String toTag) {
        Long fromUserId = userRepo.findBySub(fromSub).orElseThrow().getId();
        Long toUserId = userRepo.findByPlayerTag(toTag).orElseThrow().getId();
        FriendRequest req = new FriendRequest();
        req.setFromUserId(fromUserId);
        req.setToUserId(toUserId);
        req.setStatus("PENDING");
        return repo.save(req).getId();
    }

    public boolean respond(Long requestId, boolean accept) {
        FriendRequest req = repo.findById(requestId).orElseThrow();
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
}
