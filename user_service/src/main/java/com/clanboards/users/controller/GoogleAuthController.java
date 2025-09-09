package com.clanboards.users.controller;

import com.clanboards.users.exception.UnauthorizedException;
import com.clanboards.users.exception.ValidationException;
import com.clanboards.users.model.User;
import com.clanboards.users.service.AccountLinkingService;
import com.clanboards.users.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Base64;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class GoogleAuthController {
  private static final Logger logger = LoggerFactory.getLogger(GoogleAuthController.class);

  public record ExchangeRequest(String id_token) {}

  private final AccountLinkingService accountLinking;
  private final TokenService tokens;

  public GoogleAuthController(AccountLinkingService accountLinking, TokenService tokens) {
    this.accountLinking = accountLinking;
    this.tokens = tokens;
  }

  @PostMapping("/auth/google/exchange")
  public ResponseEntity<?> exchange(
      @RequestBody ExchangeRequest req,
      @RequestHeader(value = "User-Agent", required = false) String ua,
      @RequestHeader(value = "X-Forwarded-For", required = false) String ip,
      HttpServletRequest httpReq) {

    String clientInfo =
        String.format(
            "IP: %s, UA: %s",
            ip != null ? ip : "unknown",
            ua != null ? ua.substring(0, Math.min(ua.length(), 100)) : "unknown");

    logger.info("Google OAuth exchange attempt - {}", clientInfo);

    if (req.id_token() == null || req.id_token().trim().isEmpty()) {
      logger.warn("Google OAuth failed: missing ID token - {}", clientInfo);
      throw new ValidationException("Google ID token is required", "MISSING_ID_TOKEN", "id_token");
    }

    try {
      var claims = parseGoogleIdToken(req.id_token());
      String sub = (String) claims.get("sub");
      String email = (String) claims.get("email");
      String name = (String) claims.get("name");

      if (sub == null || sub.trim().isEmpty()) {
        logger.warn("Google OAuth failed: invalid ID token (missing sub) - {}", clientInfo);
        throw new UnauthorizedException(
            "Invalid Google ID token", "INVALID_TOKEN", "Token missing subject claim");
      }

      logger.debug("Processing Google OAuth for user: {} (email: {}) - {}", sub, email, clientInfo);

      // Use account linking service to handle email-based account linking
      var linkingResult = accountLinking.findOrCreateUser(sub, email, name);
      User user = linkingResult.getUser();

      var res = tokens.issueAll(user, ua, ip);

      logger.info(
          "Google OAuth successful for user: {} - session: {} - {}",
          user.getId(),
          res.sessionId(),
          clientInfo);

      return ResponseEntity.ok(
          Map.of(
              "access_token", res.accessToken(),
              "id_token", res.idToken(),
              "refresh_token", res.refreshToken(),
              "token_type", "Bearer",
              "expires_in", res.expiresInSeconds(),
              "sid", res.sessionId()));
    } catch (ValidationException | UnauthorizedException e) {
      throw e; // Re-throw our custom exceptions
    } catch (IllegalArgumentException e) {
      logger.warn(
          "Google OAuth failed: invalid ID token format - {} - Error: {}",
          clientInfo,
          e.getMessage());
      throw new ValidationException(
          "Invalid Google ID token format", "INVALID_TOKEN_FORMAT", "id_token");
    } catch (Exception e) {
      logger.error(
          "Google OAuth failed due to unexpected error - {} - Error: {}",
          clientInfo,
          e.getMessage(),
          e);
      throw new UnauthorizedException(
          "Google authentication failed",
          "GOOGLE_AUTH_FAILED",
          "Unable to process Google authentication");
    }
  }

  /**
   * Parse Google ID token to extract claims. This is a simplified version that just decodes the
   * payload without signature verification for demonstration purposes. In production, you would
   * want to verify the signature using Google's public keys.
   */
  @SuppressWarnings("unchecked")
  private Map<String, Object> parseGoogleIdToken(String idToken) throws Exception {
    String[] parts = idToken.split("\\.");
    if (parts.length != 3) {
      throw new IllegalArgumentException("Invalid ID token format");
    }

    // Decode the payload (middle part)
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    return new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map.class);
  }
}
