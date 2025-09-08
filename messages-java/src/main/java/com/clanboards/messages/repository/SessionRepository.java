package com.clanboards.messages.repository;

import com.clanboards.messages.model.Session;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, Long> {
  Optional<Session> findByRefreshTokenHash(String refreshTokenHash);
}
