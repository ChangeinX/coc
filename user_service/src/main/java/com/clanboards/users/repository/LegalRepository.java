package com.clanboards.users.repository;

import com.clanboards.users.model.Legal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LegalRepository extends JpaRepository<Legal, Integer> {
  Optional<Legal> findFirstByUserIdAndVersionOrderByCreatedAtDesc(Long userId, String version);

  Optional<Legal> findFirstByUserIdAndAcknowledgedDisclaimerOrderByCreatedAtDesc(
      Long userId, Boolean acknowledgedDisclaimer);
}
