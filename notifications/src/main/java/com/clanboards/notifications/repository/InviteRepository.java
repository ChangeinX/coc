package com.clanboards.notifications.repository;

import com.clanboards.notifications.repository.entity.Invite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InviteRepository extends JpaRepository<Invite, Long> {
  // Additional query methods can be added here if needed
}
