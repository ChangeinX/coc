package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clanboards.clashdata.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserController.class)
class UserControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private UserService userService;

  @Autowired private ObjectMapper objectMapper;

  @Test
  void testVerifyPlayerSuccess() throws Exception {
    // Arrange
    String token = "valid-token";
    String normalizedTag = "ABC123";
    Map<String, String> requestBody = Map.of("token", token);

    when(userService.verifyPlayerToken(token)).thenReturn(normalizedTag);

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.player_tag").value(normalizedTag));

    verify(userService).verifyPlayerToken(token);
  }

  @Test
  void testVerifyPlayerWithEmptyToken() throws Exception {
    // Arrange
    Map<String, String> requestBody = Map.of("token", "");

    when(userService.verifyPlayerToken(""))
        .thenThrow(new IllegalArgumentException("Token is required"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken("");
  }

  @Test
  void testVerifyPlayerAlreadyVerified() throws Exception {
    // Arrange
    String token = "valid-token";
    Map<String, String> requestBody = Map.of("token", token);

    when(userService.verifyPlayerToken(token))
        .thenThrow(new IllegalArgumentException("User is already verified"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken(token);
  }

  @Test
  void testVerifyPlayerTokenVerificationFailed() throws Exception {
    // Arrange
    String token = "invalid-token";
    Map<String, String> requestBody = Map.of("token", token);

    when(userService.verifyPlayerToken(token))
        .thenThrow(new RuntimeException("Token verification failed"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken(token);
  }

  @Test
  void testVerifyPlayerUnexpectedError() throws Exception {
    // Arrange
    String token = "error-token";
    Map<String, String> requestBody = Map.of("token", token);

    when(userService.verifyPlayerToken(token)).thenThrow(new RuntimeException("Unexpected error"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken(token);
  }

  @Test
  void testVerifyPlayerWithNullToken() throws Exception {
    // Arrange - request body without token field
    Map<String, Object> requestBody = Map.of();

    when(userService.verifyPlayerToken(null))
        .thenThrow(new IllegalArgumentException("Token is required"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken(null);
  }

  @Test
  void testVerifyPlayerMissingPlayerTag() throws Exception {
    // Arrange
    String token = "valid-token";
    Map<String, String> requestBody = Map.of("token", token);

    when(userService.verifyPlayerToken(token))
        .thenThrow(new IllegalArgumentException("User must have a player tag set"));

    // Act & Assert
    mockMvc
        .perform(
            post("/api/v1/users/verify")
                .with(jwt().jwt(builder -> builder.subject("user123")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isBadRequest());

    verify(userService).verifyPlayerToken(token);
  }
}
