package com.clanboards.users.service;

import com.clanboards.users.model.User;
import com.clanboards.users.repository.UserRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AccountLinkingService {
  private static final Logger logger = LoggerFactory.getLogger(AccountLinkingService.class);
  private final UserRepository users;

  public AccountLinkingService(UserRepository users) {
    this.users = users;
  }

  public static class LinkingResult {
    private final User user;
    private final boolean wasLinked;

    public LinkingResult(User user, boolean wasLinked) {
      this.user = user;
      this.wasLinked = wasLinked;
    }

    public User getUser() {
      return user;
    }

    public boolean wasLinked() {
      return wasLinked;
    }
  }

  /**
   * Find or create a user, with account linking by email.
   *
   * @param sub The OAuth subject identifier
   * @param email The user's email address
   * @param name The user's name (optional)
   * @return LinkingResult containing the user and whether accounts were linked
   */
  public LinkingResult findOrCreateUser(String sub, String email, String name) {
    if (sub == null || sub.isBlank()) {
      throw new IllegalArgumentException("Subject (sub) is required");
    }

    // First, try to find user by sub (existing account for this OAuth provider)
    Optional<User> existingBySub = users.findBySub(sub);
    if (existingBySub.isPresent()) {
      User user = existingBySub.get();
      // Update email and name if they weren't set before
      boolean updated = false;
      if (user.getEmail() == null && email != null) {
        user.setEmail(email);
        updated = true;
      }
      if (user.getName() == null && name != null) {
        user.setName(name);
        updated = true;
      }
      if (updated) {
        user = users.save(user);
        logger.info("Updated existing user {} with email: {}", sub, email);
      }
      return new LinkingResult(user, false);
    }

    // If email is provided, check for existing user with same email but different sub
    if (email != null && !email.isBlank()) {
      Optional<User> existingByEmail = users.findByEmail(email);
      if (existingByEmail.isPresent()) {
        User user = existingByEmail.get();
        // Link accounts: update the existing user with the new sub
        // This handles the case where user signs in with different OAuth providers
        logger.info(
            "Linking accounts: existing email {} with new sub {}, previous sub: {}",
            email,
            sub,
            user.getSub());
        user.setSub(sub); // Update to the new OAuth provider's sub
        if (name != null && user.getName() == null) {
          user.setName(name);
        }
        user = users.save(user);
        return new LinkingResult(user, true);
      }
    }

    // No existing user found, create new one
    User newUser = new User();
    newUser.setSub(sub);
    newUser.setEmail(email);
    newUser.setName(name != null ? name : email); // Use email as fallback name
    newUser = users.save(newUser);
    logger.info("Created new user with sub: {} and email: {}", sub, email);
    return new LinkingResult(newUser, false);
  }
}
