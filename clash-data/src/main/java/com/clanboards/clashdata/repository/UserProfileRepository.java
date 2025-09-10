package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

  /**
   * Find a user profile by user ID.
   *
   * @param userId the user ID to search for
   * @return the user profile if found, empty otherwise
   */
  Optional<UserProfile> findByUserId(Long userId);
}
