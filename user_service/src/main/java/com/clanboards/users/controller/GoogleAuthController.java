package com.clanboards.users.controller;

import com.clanboards.users.model.User;
import com.clanboards.users.service.AccountLinkingService;
import com.clanboards.users.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Base64;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class GoogleAuthController {
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
    try {
      var claims = parseGoogleIdToken(req.id_token());
      String sub = (String) claims.get("sub");
      String email = (String) claims.get("email");
      String name = (String) claims.get("name");

      // Use account linking service to handle email-based account linking
      var linkingResult = accountLinking.findOrCreateUser(sub, email, name);
      User user = linkingResult.getUser();

      var res = tokens.issueAll(user, ua, ip);
      return ResponseEntity.ok(
          Map.of(
              "access_token", res.accessToken(),
              "id_token", res.idToken(),
              "refresh_token", res.refreshToken(),
              "token_type", "Bearer",
              "expires_in", res.expiresInSeconds(),
              "sid", res.sessionId()));
    } catch (Exception e) {
      return ResponseEntity.status(401)
          .body(Map.of("error", "invalid_grant", "error_description", e.getMessage()));
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
