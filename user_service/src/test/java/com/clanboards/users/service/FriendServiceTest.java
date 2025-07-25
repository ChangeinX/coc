package com.clanboards.users.service;

import com.clanboards.users.model.FriendRequest;
import com.clanboards.users.repository.FriendRequestRepository;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.model.User;
import com.clanboards.users.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FriendServiceTest {
    @Test
    void sendRequestSavesPending() {
        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);
        FriendRequest saved = new FriendRequest();
        saved.setId(1L);
        Mockito.when(repo.save(Mockito.any())).thenReturn(saved);

        User from = new User();
        from.setId(1L);
        from.setSub("a");
        User to = new User();
        to.setId(2L);
        to.setPlayerTag("B");
        Mockito.when(userRepo.findBySub("a")).thenReturn(Optional.of(from));
        Mockito.when(userRepo.findByPlayerTag("B")).thenReturn(Optional.of(to));
        FriendService svc = new FriendService(repo, userRepo);
        Long id = svc.sendRequest("a", "B");
        assertEquals(1L, id);
        ArgumentCaptor<FriendRequest> captor = ArgumentCaptor.forClass(FriendRequest.class);
        Mockito.verify(repo).save(captor.capture());
        assertEquals("PENDING", captor.getValue().getStatus());
    }

    @Test
    void sendRequestToSelfThrows() {
        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);

        User user = new User();
        user.setId(1L);
        user.setSub("a");
        user.setPlayerTag("AA");
        Mockito.when(userRepo.findBySub("a")).thenReturn(Optional.of(user));
        Mockito.when(userRepo.findByPlayerTag("AA")).thenReturn(Optional.of(user));

        FriendService svc = new FriendService(repo, userRepo);
        assertThrows(InvalidRequestException.class, () -> svc.sendRequest("a", "AA"));
    }

    @Test
    void acceptRequestUpdatesStatus() {
        FriendRequest req = new FriendRequest();
        req.setId(2L);
        req.setFromUserId(1L);
        req.setToUserId(2L);
        req.setStatus("PENDING");

        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);
        Mockito.when(repo.findById(2L)).thenReturn(Optional.of(req));

        FriendService svc = new FriendService(repo, userRepo);
        boolean result = svc.respond(2L, true);
        assertTrue(result);
        Mockito.verify(repo).save(req);
        assertEquals("ACCEPTED", req.getStatus());
    }

    @Test
    void listRequestsGetsPending() {
        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);

        User user = new User();
        user.setId(1L);
        user.setSub("abc");
        Mockito.when(userRepo.findBySub("abc")).thenReturn(Optional.of(user));

        FriendRequest req = new FriendRequest();
        req.setId(5L);
        req.setFromUserId(2L);
        Mockito.when(repo.findByToUserIdAndStatus(1L, "PENDING")).thenReturn(List.of(req));

        FriendService svc = new FriendService(repo, userRepo);
        List<FriendRequest> list = svc.listRequests("abc");
        assertEquals(1, list.size());
        assertEquals(5L, list.get(0).getId());
    }

    @Test
    void listFriendsIncludesPlayerTag() {
        FriendRequestRepository repo = Mockito.mock(FriendRequestRepository.class);
        UserRepository userRepo = Mockito.mock(UserRepository.class);

        User user = new User();
        user.setId(1L);
        user.setSub("abc");
        Mockito.when(userRepo.findBySub("abc")).thenReturn(Optional.of(user));

        User friend = new User();
        friend.setId(2L);
        friend.setSub("other");
        friend.setPlayerTag("#AAA");
        Mockito.when(userRepo.findById(2L)).thenReturn(Optional.of(friend));

        FriendRequest req = new FriendRequest();
        req.setId(5L);
        req.setFromUserId(1L);
        req.setToUserId(2L);
        req.setStatus("ACCEPTED");
        Mockito.when(repo.findFriends(1L, "ACCEPTED")).thenReturn(List.of(req));

        FriendService svc = new FriendService(repo, userRepo);
        List<FriendService.FriendDto> list = svc.listFriends("abc");
        assertEquals(1, list.size());
        assertEquals("other", list.get(0).userId());
        assertEquals("#AAA", list.get(0).playerTag());
    }
}
