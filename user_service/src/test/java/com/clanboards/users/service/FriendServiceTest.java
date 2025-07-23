package com.clanboards.users.service;

import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.model.FriendshipItem;
import com.clanboards.users.repository.FriendRequestRepository;
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
        DynamoDbEnhancedClient client = Mockito.mock(DynamoDbEnhancedClient.class);
        DynamoDbTable<FriendshipItem> table = Mockito.mock(DynamoDbTable.class);
        Mockito.when(client.table(Mockito.anyString(), Mockito.any(TableSchema.class))).thenReturn(table);
        FriendRequest saved = new FriendRequest();
        saved.setId(1L);
        Mockito.when(repo.save(Mockito.any())).thenReturn(saved);

        FriendService svc = new FriendService(repo, client);
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
        req.setFromUserId("a");
        req.setToUserId("b");
        req.setStatus("PENDING");

        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        Mockito.when(repo.findById(2L)).thenReturn(Optional.of(req));
        DynamoDbEnhancedClient client = Mockito.mock(DynamoDbEnhancedClient.class);
        DynamoDbTable<FriendshipItem> table = Mockito.mock(DynamoDbTable.class);
        Mockito.when(client.table(Mockito.anyString(), Mockito.any(TableSchema.class))).thenReturn(table);

        FriendService svc = new FriendService(repo, client);
        boolean result = svc.respond(2L, true);
        assertTrue(result);
        Mockito.verify(table, Mockito.times(2)).putItem(Mockito.any(FriendshipItem.class));
        Mockito.verify(repo).save(req);
        assertEquals("ACCEPTED", req.getStatus());
    }
}
