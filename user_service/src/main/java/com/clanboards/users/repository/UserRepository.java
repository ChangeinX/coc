package com.clanboards.users.repository;

import com.clanboards.users.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findBySub(String sub);

  Optional<User> findByPlayerTag(String playerTag);
}
