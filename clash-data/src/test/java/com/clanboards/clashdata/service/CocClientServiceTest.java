package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class CocClientServiceTest {

  @Test
  void testConstructorWithEmptyEmail() {
    IllegalArgumentException exception =
        assertThrows(IllegalArgumentException.class, () -> new CocClientService("", "password"));
    assertEquals(
        "COC_EMAIL and COC_PASSWORD environment variables are required", exception.getMessage());
  }

  @Test
  void testConstructorWithEmptyPassword() {
    IllegalArgumentException exception =
        assertThrows(
            IllegalArgumentException.class, () -> new CocClientService("test@example.com", ""));
    assertEquals(
        "COC_EMAIL and COC_PASSWORD environment variables are required", exception.getMessage());
  }

  @Test
  void testConstructorWithNullEmail() {
    IllegalArgumentException exception =
        assertThrows(IllegalArgumentException.class, () -> new CocClientService(null, "password"));
    assertEquals(
        "COC_EMAIL and COC_PASSWORD environment variables are required", exception.getMessage());
  }

  @Test
  void testConstructorWithNullPassword() {
    IllegalArgumentException exception =
        assertThrows(
            IllegalArgumentException.class, () -> new CocClientService("test@example.com", null));
    assertEquals(
        "COC_EMAIL and COC_PASSWORD environment variables are required", exception.getMessage());
  }
}
