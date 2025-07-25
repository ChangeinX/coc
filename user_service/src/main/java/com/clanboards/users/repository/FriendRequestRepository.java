package com.clanboards.users.repository;

import com.clanboards.users.model.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByToUserIdAndStatus(Long toUserId, String status);

    List<FriendRequest> findByFromUserIdAndStatus(Long fromUserId, String status);

    @Query("SELECT f FROM FriendRequest f WHERE (f.fromUserId = :userId OR f.toUserId = :userId) AND f.status = :status")
    List<FriendRequest> findFriends(@Param("userId") Long userId, @Param("status") String status);
}
