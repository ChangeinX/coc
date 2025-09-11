package com.clanboards.auth.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class OidcPropertiesTest {

  @Test
  void defaultValues_areSetCorrectly() {
    OidcProperties properties = new OidcProperties();
    
    assertEquals("http://localhost:8080", properties.getIssuer());
    assertEquals("clanboards-mobile", properties.getAudience());
    assertEquals("http://localhost:8080", properties.getUserServiceUrl());
    assertEquals(15, properties.getKeysCacheDurationMinutes());
    assertEquals(10, properties.getConnectionTimeoutSeconds());
    assertEquals("db", properties.getJwksSource());
    assertEquals("oidc.jwks", properties.getJwksDbKey());
    assertTrue(properties.isDisallowHttp());
  }

  @Test
  void jwksSource_canBeSetAndRetrieved() {
    OidcProperties properties = new OidcProperties();
    
    properties.setJwksSource("http");
    assertEquals("http", properties.getJwksSource());
    
    properties.setJwksSource("db");
    assertEquals("db", properties.getJwksSource());
  }

  @Test
  void jwksDbKey_canBeSetAndRetrieved() {
    OidcProperties properties = new OidcProperties();
    
    properties.setJwksDbKey("custom.jwks.key");
    assertEquals("custom.jwks.key", properties.getJwksDbKey());
  }

  @Test
  void disallowHttp_canBeSetAndRetrieved() {
    OidcProperties properties = new OidcProperties();
    
    properties.setDisallowHttp(false);
    assertFalse(properties.isDisallowHttp());
    
    properties.setDisallowHttp(true);
    assertTrue(properties.isDisallowHttp());
  }

  @Test
  void jwksUrl_constructedFromUserServiceUrl() {
    OidcProperties properties = new OidcProperties();
    properties.setUserServiceUrl("https://example.com");
    
    assertEquals("https://example.com/api/v1/users/oauth2/jwks.json", properties.getJwksUrl());
  }

  @Test
  void allSettersWork() {
    OidcProperties properties = new OidcProperties();
    
    properties.setIssuer("https://test.example.com");
    properties.setAudience("test-audience");
    properties.setUserServiceUrl("https://users.example.com");
    properties.setKeysCacheDurationMinutes(30);
    properties.setConnectionTimeoutSeconds(5);
    properties.setJwksSource("http");
    properties.setJwksDbKey("test.jwks");
    properties.setDisallowHttp(false);
    
    assertEquals("https://test.example.com", properties.getIssuer());
    assertEquals("test-audience", properties.getAudience());
    assertEquals("https://users.example.com", properties.getUserServiceUrl());
    assertEquals(30, properties.getKeysCacheDurationMinutes());
    assertEquals(5, properties.getConnectionTimeoutSeconds());
    assertEquals("http", properties.getJwksSource());
    assertEquals("test.jwks", properties.getJwksDbKey());
    assertFalse(properties.isDisallowHttp());
  }
}