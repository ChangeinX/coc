package com.clanboards.users.service;

import com.clanboards.users.exception.InvalidRequestException;
import com.clanboards.users.model.Legal;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.LegalRepository;
import com.clanboards.users.repository.UserRepository;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LegalService {

  private final LegalRepository legalRepository;
  private final UserRepository userRepository;
  private final String legalVersion;

  public LegalService(
      LegalRepository legalRepository,
      UserRepository userRepository,
      @Value("${legal.version:1.0.0}") String legalVersion) {
    this.legalRepository = legalRepository;
    this.userRepository = userRepository;
    this.legalVersion = legalVersion;
  }

  public LegalStatusResponse getLegalStatus(Long userId) {
    Optional<Legal> legal =
        legalRepository.findFirstByUserIdAndVersionOrderByCreatedAtDesc(userId, legalVersion);

    if (legal.isPresent()) {
      Legal record = legal.get();
      boolean accepted = record.getAccepted() && legalVersion.equals(record.getVersion());
      return new LegalStatusResponse(accepted, record.getVersion());
    }

    return new LegalStatusResponse(false, null);
  }

  public void acceptLegal(Long userId, String version) {
    Legal legal = new Legal();
    legal.setUserId(userId);
    legal.setAccepted(true);
    legal.setVersion(version);
    legal.setAcknowledgedDisclaimer(false);

    legalRepository.save(legal);
  }

  public boolean getDisclaimerStatus(Long userId) {
    return legalRepository
        .findFirstByUserIdAndAcknowledgedDisclaimerOrderByCreatedAtDesc(userId, true)
        .isPresent();
  }

  public void acceptDisclaimer(Long userId) {
    // Update user's seen disclaimer flag
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new InvalidRequestException("User not found"));

    user.setSeenSupercellDisclaimer(true);
    userRepository.save(user);

    // Create legal record for disclaimer acknowledgment
    Legal legal = new Legal();
    legal.setUserId(userId);
    legal.setAccepted(false); // Not a legal acceptance, just disclaimer acknowledgment
    legal.setVersion(legalVersion);
    legal.setAcknowledgedDisclaimer(true);

    legalRepository.save(legal);
  }

  public static class LegalStatusResponse {
    private final boolean accepted;
    private final String version;

    public LegalStatusResponse(boolean accepted, String version) {
      this.accepted = accepted;
      this.version = version;
    }

    public boolean isAccepted() {
      return accepted;
    }

    public String getVersion() {
      return version;
    }
  }
}
