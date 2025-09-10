package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.dto.VerifyRequest;
import com.clanboards.clashdata.service.UserService;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

  private static final Logger logger = LoggerFactory.getLogger(UserController.class);

  private final UserService userService;

  @Autowired
  public UserController(UserService userService) {
    this.userService = userService;
  }

  /**
   * Verify a player's API token via the Clash of Clans API.
   *
   * @param request the verification request containing the token
   * @return the verification result with player tag
   */
  @PostMapping("/verify")
  public ResponseEntity<Map<String, Object>> verifyPlayer(@RequestBody VerifyRequest request) {
    logger.info("Received player verification request");

    try {
      String normalizedTag = userService.verifyPlayerToken(request.getToken());

      Map<String, Object> response = new HashMap<>();
      response.put("status", "ok");
      response.put("player_tag", normalizedTag);

      logger.info("Player verification successful for tag: {}", normalizedTag);
      return ResponseEntity.ok(response);

    } catch (IllegalArgumentException e) {
      logger.warn("Player verification failed: {}", e.getMessage());
      return ResponseEntity.badRequest().build();

    } catch (RuntimeException e) {
      logger.error("Player verification error: {}", e.getMessage());
      return ResponseEntity.badRequest().build();

    } catch (Exception e) {
      logger.error("Unexpected error during player verification: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }
}
