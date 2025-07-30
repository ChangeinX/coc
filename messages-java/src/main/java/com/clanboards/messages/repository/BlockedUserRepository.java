package com.clanboards.messages.repository;

import com.clanboards.messages.model.BlockedUser;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlockedUserRepository extends JpaRepository<BlockedUser, String> {

  /** Insert or update a blocked user record atomically. */
  @Modifying
  @org.springframework.transaction.annotation.Transactional
  @Query(
      value =
          "insert into blocked (user_id, until, permanent, reason, created_at) "
              + "values (:userId, :until, :permanent, :reason, :createdAt) "
              + "on conflict (user_id) do update set "
              + "until=excluded.until, permanent=excluded.permanent, "
              + "reason=excluded.reason, created_at=excluded.created_at",
      nativeQuery = true)
  void upsert(
      @Param("userId") String userId,
      @Param("until") Instant until,
      @Param("permanent") Boolean permanent,
      @Param("reason") String reason,
      @Param("createdAt") Instant createdAt);
}
