package com.clanboards.users.bootstrap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.model.SystemConfig;
import com.clanboards.users.repository.SystemConfigRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwksPublisherTest {

  @Mock private KeyHolder keyHolder;
  @Mock private SystemConfigRepository systemConfigRepository;

  private JwksPublisher jwksPublisher;
  private KeyPair testKeyPair;
  private static final String JWKS_KEY = "oidc.jwks";
  private static final String TEST_KID = "test-key-1";

  @BeforeEach
  void setUp() throws Exception {
    // Generate test key pair
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    testKeyPair = generator.generateKeyPair();

    jwksPublisher = new JwksPublisher(keyHolder, systemConfigRepository, JWKS_KEY);
  }

  @Test
  void publishJwks_withValidKeyHolder_savesJwksToDatabase() throws Exception {
    // Arrange
    String expectedJwksJson = "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"" + TEST_KID + "\"}]}";
    when(keyHolder.jwksJson()).thenReturn(expectedJwksJson);

    // Act
    jwksPublisher.publishJwks();

    // Assert
    ArgumentCaptor<SystemConfig> configCaptor = ArgumentCaptor.forClass(SystemConfig.class);
    verify(systemConfigRepository).save(configCaptor.capture());

    SystemConfig savedConfig = configCaptor.getValue();
    assertEquals(JWKS_KEY, savedConfig.getKey());
    assertEquals(expectedJwksJson, savedConfig.getValue());
    assertEquals("JWKS for OIDC validation", savedConfig.getDescription());
    assertNotNull(savedConfig.getUpdatedAt());
  }

  @Test
  void publishJwks_withExistingConfig_updatesExistingRecord() throws Exception {
    // Arrange
    String newJwksJson = "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"updated-key\"}]}";
    when(keyHolder.jwksJson()).thenReturn(newJwksJson);

    SystemConfig existingConfig = new SystemConfig();
    existingConfig.setKey(JWKS_KEY);
    existingConfig.setValue("old-jwks-value");
    existingConfig.setDescription("old description");
    existingConfig.setUpdatedAt(
        Instant.now().minusSeconds(10)); // More recent, but still in the past

    when(systemConfigRepository.findByKey(JWKS_KEY)).thenReturn(Optional.of(existingConfig));

    // Add a small delay to ensure timestamp difference
    try {
      Thread.sleep(10);
    } catch (InterruptedException e) {
    }

    // Act
    jwksPublisher.publishJwks();

    // Assert
    ArgumentCaptor<SystemConfig> configCaptor = ArgumentCaptor.forClass(SystemConfig.class);
    verify(systemConfigRepository).save(configCaptor.capture());

    SystemConfig savedConfig = configCaptor.getValue();
    assertEquals(JWKS_KEY, savedConfig.getKey());
    assertEquals(newJwksJson, savedConfig.getValue());
    assertEquals("JWKS for OIDC validation", savedConfig.getDescription());
    assertNotNull(savedConfig.getUpdatedAt());
    // Ensure it's the same object (existing config was updated)
    assertEquals(existingConfig, savedConfig);
  }

  @Test
  void publishJwks_withKeyHolderException_throwsRuntimeException() {
    // Arrange
    when(keyHolder.jwksJson()).thenThrow(new RuntimeException("Key generation failed"));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> jwksPublisher.publishJwks());
    assertTrue(exception.getMessage().contains("Failed to publish JWKS"));
    assertTrue(exception.getCause().getMessage().contains("Key generation failed"));
  }

  @Test
  void publishJwks_withRepositoryException_throwsRuntimeException() throws Exception {
    // Arrange
    String jwksJson = "{\"keys\":[]}";
    when(keyHolder.jwksJson()).thenReturn(jwksJson);
    when(systemConfigRepository.save(any())).thenThrow(new RuntimeException("Database error"));

    // Act & Assert
    RuntimeException exception =
        assertThrows(RuntimeException.class, () -> jwksPublisher.publishJwks());
    assertTrue(exception.getMessage().contains("Failed to publish JWKS"));
    assertTrue(exception.getCause().getMessage().contains("Database error"));
  }

  @Test
  void publishJwks_createsValidJwksStructure() throws Exception {
    // Arrange
    String testJwksJson = buildValidJwksJson();
    when(keyHolder.jwksJson()).thenReturn(testJwksJson);

    // Act
    jwksPublisher.publishJwks();

    // Assert
    ArgumentCaptor<SystemConfig> configCaptor = ArgumentCaptor.forClass(SystemConfig.class);
    verify(systemConfigRepository).save(configCaptor.capture());

    SystemConfig savedConfig = configCaptor.getValue();
    String jwksValue = savedConfig.getValue();

    // Verify it's valid JSON with proper structure
    ObjectMapper objectMapper = new ObjectMapper();
    JsonNode jwksNode = objectMapper.readTree(jwksValue);
    assertTrue(jwksNode.has("keys"));
    assertTrue(jwksNode.get("keys").isArray());
    assertTrue(jwksNode.get("keys").size() > 0);

    JsonNode firstKey = jwksNode.get("keys").get(0);
    assertTrue(firstKey.has("kty"));
    assertTrue(firstKey.has("kid"));
    assertEquals("RSA", firstKey.get("kty").asText());
  }

  @Test
  void constructor_withCustomKey_usesCustomKey() throws Exception {
    // Arrange
    String customKey = "custom.jwks.key";
    JwksPublisher customPublisher = new JwksPublisher(keyHolder, systemConfigRepository, customKey);
    String jwksJson = "{\"keys\":[]}";
    when(keyHolder.jwksJson()).thenReturn(jwksJson);

    // Act
    customPublisher.publishJwks();

    // Assert
    ArgumentCaptor<SystemConfig> configCaptor = ArgumentCaptor.forClass(SystemConfig.class);
    verify(systemConfigRepository).save(configCaptor.capture());
    assertEquals(customKey, configCaptor.getValue().getKey());
  }

  private String buildValidJwksJson() throws Exception {
    // Build a minimal but valid JWKS JSON structure
    return String.format(
        "{\"keys\":[{\"kty\":\"RSA\",\"kid\":\"%s\",\"n\":\"test-modulus\",\"e\":\"AQAB\"}]}",
        TEST_KID);
  }
}
