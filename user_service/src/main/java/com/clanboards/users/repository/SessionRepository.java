package com.clanboards.users.repository;

import com.clanboards.users.model.Session;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, Long> {
  Optional<Session> findByRefreshTokenHash(String refreshTokenHash);
}
