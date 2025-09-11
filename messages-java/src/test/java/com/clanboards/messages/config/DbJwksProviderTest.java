package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.messages.model.SystemConfig;
import com.clanboards.messages.repository.SystemConfigRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DbJwksProviderTest {

  @Mock private SystemConfigRepository systemConfigRepository;

  private DbJwksProvider dbJwksProvider;
  private static final String JWKS_KEY = "oidc.jwks";
  private static final String VALID_JWKS_JSON =
      "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"test-key-1\",\"n\":\"test-n\",\"e\":\"AQAB\"}]}";

  @BeforeEach
  void setUp() {
    dbJwksProvider = new DbJwksProvider(systemConfigRepository, JWKS_KEY);
  }

  @Test
  void loadJwksJson_withValidConfig_returnsJwksJson() {
    // Arrange
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue(VALID_JWKS_JSON);
    config.setUpdatedAt(Instant.now());

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act
    String result = dbJwksProvider.loadJwksJson();

    // Assert
    assertEquals(VALID_JWKS_JSON, result);
    verify(systemConfigRepository).findByKey(JWKS_KEY);
  }

  @Test
  void loadJwksJson_withMissingConfig_throwsException() {
    // Arrange
    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.empty());

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> dbJwksProvider.loadJwksJson());
    assertTrue(exception.getMessage().contains("JWKS configuration not found"));
    assertTrue(exception.getMessage().contains(JWKS_KEY));
  }

  @Test
  void loadJwksJson_withNullValue_throwsException() {
    // Arrange
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue(null);

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> dbJwksProvider.loadJwksJson());
    assertTrue(exception.getMessage().contains("JWKS configuration value is null"));
  }

  @Test
  void loadJwksJson_withEmptyValue_throwsException() {
    // Arrange
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue("");

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> dbJwksProvider.loadJwksJson());
    assertTrue(exception.getMessage().contains("JWKS configuration value is empty"));
  }

  @Test
  void loadJwksJson_withBlankValue_throwsException() {
    // Arrange
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue("   ");

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> dbJwksProvider.loadJwksJson());
    assertTrue(exception.getMessage().contains("JWKS configuration value is empty"));
  }

  @Test
  void lastUpdated_withValidConfig_returnsUpdatedAt() {
    // Arrange
    Instant expectedTime = Instant.now().minusSeconds(300);
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue(VALID_JWKS_JSON);
    config.setUpdatedAt(expectedTime);

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act
    Instant result = dbJwksProvider.lastUpdated();

    // Assert
    assertEquals(expectedTime, result);
    verify(systemConfigRepository).findByKey(JWKS_KEY);
  }

  @Test
  void lastUpdated_withMissingConfig_returnsNull() {
    // Arrange
    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.empty());

    // Act
    Instant result = dbJwksProvider.lastUpdated();

    // Assert
    assertNull(result);
  }

  @Test
  void lastUpdated_withNullUpdatedAt_returnsNull() {
    // Arrange
    SystemConfig config = new SystemConfig();
    config.setKey(JWKS_KEY);
    config.setValue(VALID_JWKS_JSON);
    config.setUpdatedAt(null);

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(config));

    // Act
    Instant result = dbJwksProvider.lastUpdated();

    // Assert
    assertNull(result);
  }

  @Test
  void constructor_withCustomKey_usesCustomKey() {
    // Arrange
    String customKey = "custom.jwks.key";
    DbJwksProvider customProvider = new DbJwksProvider(systemConfigRepository, customKey);

    SystemConfig config = new SystemConfig();
    config.setKey(customKey);
    config.setValue(VALID_JWKS_JSON);

    when(systemConfigRepository.findByKey(customKey)).thenReturn(Optional.of(config));

    // Act
    String result = customProvider.loadJwksJson();

    // Assert
    assertEquals(VALID_JWKS_JSON, result);
    verify(systemConfigRepository).findByKey(customKey);
  }

  @Test
  void repositoryException_wrapsInRuntimeException() {
    // Arrange
    when(systemConfigRepository.findByKey(JWKS_KEY))
        .thenThrow(new RuntimeException("Database connection failed"));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> dbJwksProvider.loadJwksJson());
    assertTrue(exception.getMessage().contains("Failed to load JWKS from database"));
    assertTrue(exception.getCause().getMessage().contains("Database connection failed"));
  }
}
