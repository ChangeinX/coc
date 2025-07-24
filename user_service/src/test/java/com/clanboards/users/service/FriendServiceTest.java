package com.clanboards.users.service;

import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.model.FriendshipItem;
import com.clanboards.users.repository.FriendRequestRepository;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.model.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class FriendServiceTest {
    @Test
    void sendRequestSavesPending() {
        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);
        DynamoDbEnhancedClient client = Mockito.mock(DynamoDbEnhancedClient.class);
        DynamoDbTable<FriendshipItem> table = Mockito.mock(DynamoDbTable.class);
        Mockito.when(client.table(Mockito.anyString(), Mockito.any(TableSchema.class))).thenReturn(table);
        FriendRequest saved = new FriendRequest();
        saved.setId(1L);
        Mockito.when(repo.save(Mockito.any())).thenReturn(saved);

        User from = new User();
        from.setId(1L);
        from.setSub("a");
        User to = new User();
        to.setId(2L);
        to.setSub("b");
        Mockito.when(userRepo.findBySub("a")).thenReturn(Optional.of(from));
        Mockito.when(userRepo.findBySub("b")).thenReturn(Optional.of(to));
        FriendService svc = new FriendService(repo, userRepo, client);
        Long id = svc.sendRequest("a", "b");
        assertEquals(1L, id);
        ArgumentCaptor<FriendRequest> captor = ArgumentCaptor.forClass(FriendRequest.class);
        Mockito.verify(repo).save(captor.capture());
        assertEquals("PENDING", captor.getValue().getStatus());
    }

    @Test
    void acceptRequestWritesFriends() {
        FriendRequest req = new FriendRequest();
        req.setId(2L);
        req.setFromUserId(1L);
        req.setToUserId(2L);
        req.setStatus("PENDING");

        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);
        Mockito.when(repo.findById(2L)).thenReturn(Optional.of(req));
        DynamoDbEnhancedClient client = Mockito.mock(DynamoDbEnhancedClient.class);
        DynamoDbTable<FriendshipItem> table = Mockito.mock(DynamoDbTable.class);
        Mockito.when(client.table(Mockito.anyString(), Mockito.any(TableSchema.class))).thenReturn(table);

        FriendService svc = new FriendService(repo, userRepo, client);
        boolean result = svc.respond(2L, true);
        assertTrue(result);
        Mockito.verify(table, Mockito.times(2)).putItem(Mockito.any(FriendshipItem.class));
        Mockito.verify(repo).save(req);
        assertEquals("ACCEPTED", req.getStatus());
    }
}
