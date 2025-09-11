package com.clanboards.auth.repository;

import com.clanboards.auth.model.Session;
import java.util.Optional;

/**
 * Interface for session repositories that can be used with OIDC authentication. Services can
 * implement this interface with their own repositories.
 */
public interface SessionRepository<T extends Session> {
  Optional<T> findById(Long id);
}
