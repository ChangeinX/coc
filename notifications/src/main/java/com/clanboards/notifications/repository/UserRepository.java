package com.clanboards.notifications.repository;

import com.clanboards.notifications.repository.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findBySub(String sub);
}
