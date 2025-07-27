package com.clanboards.users.repository;

import com.clanboards.users.model.FriendRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
  List<FriendRequest> findByToUserIdAndStatus(Long toUserId, String status);

  List<FriendRequest> findByFromUserIdAndStatus(Long fromUserId, String status);

  @Query(
      "SELECT f FROM FriendRequest f WHERE (f.fromUserId = :userId OR f.toUserId = :userId) AND f.status = :status")
  List<FriendRequest> findFriends(@Param("userId") Long userId, @Param("status") String status);

  @Query(
      "SELECT f FROM FriendRequest f WHERE (f.fromUserId = :a AND f.toUserId = :b) OR (f.fromUserId = :b AND f.toUserId = :a)")
  List<FriendRequest> findBetweenUsers(@Param("a") Long a, @Param("b") Long b);
}
