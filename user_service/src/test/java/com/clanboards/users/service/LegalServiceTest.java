package com.clanboards.users.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clanboards.users.model.Legal;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.LegalRepository;
import com.clanboards.users.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LegalServiceTest {

  @Test
  void getLegalStatusReturnsTrueWhenAcceptedCurrentVersion() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    Legal legal = new Legal();
    legal.setUserId(123L);
    legal.setAccepted(true);
    legal.setVersion("1.2.0");
    when(legalRepo.findFirstByUserIdAndVersionOrderByCreatedAtDesc(123L, "1.2.0"))
        .thenReturn(Optional.of(legal));

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    LegalService.LegalStatusResponse result = service.getLegalStatus(123L);

    assertTrue(result.isAccepted());
    assertEquals("1.2.0", result.getVersion());
  }

  @Test
  void getLegalStatusReturnsFalseWhenNotAccepted() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    Legal legal = new Legal();
    legal.setUserId(123L);
    legal.setAccepted(false);
    legal.setVersion("1.2.0");
    when(legalRepo.findFirstByUserIdAndVersionOrderByCreatedAtDesc(123L, "1.2.0"))
        .thenReturn(Optional.of(legal));

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    LegalService.LegalStatusResponse result = service.getLegalStatus(123L);

    assertFalse(result.isAccepted());
    assertEquals("1.2.0", result.getVersion());
  }

  @Test
  void getLegalStatusReturnsFalseWhenOldVersion() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    Legal legal = new Legal();
    legal.setUserId(123L);
    legal.setAccepted(true);
    legal.setVersion("1.1.0"); // Old version
    when(legalRepo.findFirstByUserIdAndVersionOrderByCreatedAtDesc(123L, "1.2.0"))
        .thenReturn(Optional.of(legal));

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    LegalService.LegalStatusResponse result = service.getLegalStatus(123L);

    assertFalse(result.isAccepted());
    assertEquals("1.1.0", result.getVersion()); // Still returns the found version
  }

  @Test
  void getLegalStatusReturnsFalseWhenNoRecord() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    when(legalRepo.findFirstByUserIdAndVersionOrderByCreatedAtDesc(123L, "1.2.0"))
        .thenReturn(Optional.empty());

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    LegalService.LegalStatusResponse result = service.getLegalStatus(123L);

    assertFalse(result.isAccepted());
    assertNull(result.getVersion());
  }

  @Test
  void acceptLegalCreatesAcceptanceRecord() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    Legal savedLegal = new Legal();
    savedLegal.setId(1);
    when(legalRepo.save(any(Legal.class))).thenReturn(savedLegal);

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    service.acceptLegal(123L, "1.2.0");

    ArgumentCaptor<Legal> captor = ArgumentCaptor.forClass(Legal.class);
    verify(legalRepo).save(captor.capture());
    Legal saved = captor.getValue();

    assertEquals(123L, saved.getUserId());
    assertTrue(saved.getAccepted());
    assertEquals("1.2.0", saved.getVersion());
    assertFalse(saved.getAcknowledgedDisclaimer()); // Should be false for legal acceptance
  }

  @Test
  void getDisclaimerStatusReturnsTrueWhenAcknowledged() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    Legal legal = new Legal();
    legal.setUserId(123L);
    legal.setAcknowledgedDisclaimer(true);
    when(legalRepo.findFirstByUserIdAndAcknowledgedDisclaimerOrderByCreatedAtDesc(123L, true))
        .thenReturn(Optional.of(legal));

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    boolean result = service.getDisclaimerStatus(123L);

    assertTrue(result);
  }

  @Test
  void getDisclaimerStatusReturnsFalseWhenNotAcknowledged() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    when(legalRepo.findFirstByUserIdAndAcknowledgedDisclaimerOrderByCreatedAtDesc(123L, true))
        .thenReturn(Optional.empty());

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    boolean result = service.getDisclaimerStatus(123L);

    assertFalse(result);
  }

  @Test
  void acceptDisclaimerUpdatesUserAndCreatesRecord() {
    LegalRepository legalRepo = mock(LegalRepository.class);
    UserRepository userRepo = mock(UserRepository.class);

    User user = new User();
    user.setId(123L);
    user.setSeenSupercellDisclaimer(false);
    when(userRepo.findById(123L)).thenReturn(Optional.of(user));

    Legal savedLegal = new Legal();
    savedLegal.setId(1);
    when(legalRepo.save(any(Legal.class))).thenReturn(savedLegal);

    LegalService service = new LegalService(legalRepo, userRepo, "1.2.0");
    service.acceptDisclaimer(123L);

    // Verify user was updated
    assertTrue(user.getSeenSupercellDisclaimer());
    verify(userRepo).save(user);

    // Verify legal record was created
    ArgumentCaptor<Legal> captor = ArgumentCaptor.forClass(Legal.class);
    verify(legalRepo).save(captor.capture());
    Legal saved = captor.getValue();

    assertEquals(123L, saved.getUserId());
    assertFalse(saved.getAccepted()); // Should be false for disclaimer acknowledgment
    assertEquals("1.2.0", saved.getVersion());
    assertTrue(saved.getAcknowledgedDisclaimer());
  }
}
